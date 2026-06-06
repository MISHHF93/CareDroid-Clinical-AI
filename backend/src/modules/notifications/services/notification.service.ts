import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationStatus,
} from '../entities/notification.entity';
import { FirebaseService } from './firebase.service';
import { DeviceTokenService } from './device-token.service';
import { NotificationPreferenceService } from './notification-preference.service';

export interface SendNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'normal' | 'high';
  expiresIn?: number; // milliseconds
}

export interface SendBulkNotificationDto {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'normal' | 'high';
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private firebaseService: FirebaseService,
    private deviceTokenService: DeviceTokenService,
    private preferenceService: NotificationPreferenceService,
  ) {}

  /**
   * Send notification to a single user
   */
  async sendNotification(dto: SendNotificationDto): Promise<Notification> {
    try {
      // Check if user can receive this notification type
      const canReceive = await this.preferenceService.canReceiveNotification(dto.userId, dto.type);

      if (!canReceive) {
        this.logger.log(`User ${dto.userId} has disabled ${dto.type} notifications`);
        // Still create the notification record but don't send
        return await this.createNotificationRecord(dto, NotificationStatus.PENDING);
      }

      // Get user's device tokens
      const tokens = await this.deviceTokenService.getActiveTokens(dto.userId);

      if (tokens.length === 0) {
        this.logger.warn(`No active device tokens for user ${dto.userId}`);
        return await this.createNotificationRecord(dto, NotificationStatus.FAILED);
      }

      // Create notification record
      const notification = await this.createNotificationRecord(dto, NotificationStatus.PENDING);

      // Send to all user devices
      const results = await Promise.all(
        tokens.map((token) =>
          this.firebaseService.sendPushNotification(
            token,
            dto.title,
            dto.body,
            this.convertDataToStrings(dto.data),
            {
              priority: dto.priority,
              ttl: dto.expiresIn,
            },
          ),
        ),
      );

      // Process results
      const successfulSends = results.filter((r) => r.success);
      const failedSends = results.filter((r) => !r.success);

      // Mark invalid tokens
      for (let i = 0; i < results.length; i++) {
        if (results[i].error === 'invalid_token') {
          await this.deviceTokenService.markTokenAsInvalid(tokens[i]);
        }
      }

      // Update notification status
      if (successfulSends.length > 0) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
        notification.fcmMessageId = successfulSends[0].messageId;
      } else {
        notification.status = NotificationStatus.FAILED;
        notification.errorMessage = failedSends[0]?.error || 'All sends failed';
      }

      await this.notificationRepository.save(notification);

      this.logger.log(
        `Notification sent to user ${dto.userId}: ${successfulSends.length}/${tokens.length} successful`,
      );

      return notification;
    } catch (error) {
      this.logger.error(`Failed to send notification:`, error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(dto: SendBulkNotificationDto): Promise<{
    successCount: number;
    failureCount: number;
    notifications: Notification[];
  }> {
    const notifications: Notification[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const userId of dto.userIds) {
      try {
        const notification = await this.sendNotification({
          userId,
          type: dto.type,
          title: dto.title,
          body: dto.body,
          data: dto.data,
          priority: dto.priority,
        });

        notifications.push(notification);

        if (notification.status === NotificationStatus.SENT) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to send notification to user ${userId}:`, error);
        failureCount++;
      }
    }

    this.logger.log(`Bulk notification sent: ${successCount} successes, ${failureCount} failures`);

    return {
      successCount,
      failureCount,
      notifications,
    };
  }

  /**
   * Send emergency notification (bypasses preferences)
   */
  async sendEmergencyNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<Notification> {
    return await this.sendNotification({
      userId,
      type: NotificationType.EMERGENCY,
      title,
      body,
      data,
      priority: 'high',
    });
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { notifications, total };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: {
        userId,
        status: In([NotificationStatus.SENT, NotificationStatus.DELIVERED]),
        readAt: null as any,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();

    await this.notificationRepository.save(notification);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({
        status: NotificationStatus.READ,
        readAt: new Date(),
      })
      .where('userId = :userId', { userId })
      .andWhere('readAt IS NULL')
      .execute();

    this.logger.log(`Marked all notifications as read for user ${userId}`);
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });

    if (result.affected === 0) {
      throw new Error('Notification not found');
    }
  }

  /**
   * Delete all user notifications (GDPR compliance)
   */
  async deleteAllUserNotifications(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId });

    this.logger.log(`Deleted all notifications for user ${userId}`);
  }

  /**
   * Clean up old notifications (run periodically)
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('status != :emergencyStatus', {
        emergencyStatus: NotificationStatus.PENDING,
      })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old notifications`);

    return result.affected || 0;
  }

  /**
   * Helper: Create notification database record
   */
  private async createNotificationRecord(
    dto: SendNotificationDto,
    status: NotificationStatus,
  ): Promise<Notification> {
    const expiresAt = dto.expiresIn ? new Date(Date.now() + dto.expiresIn) : null;

    const notification = this.notificationRepository.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      status,
      expiresAt,
    });

    return await this.notificationRepository.save(notification);
  }

  /**
   * Helper: Convert data object to string values (FCM requirement)
   */
  private convertDataToStrings(data?: Record<string, any>): Record<string, string> | undefined {
    if (!data) return undefined;

    const stringData: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object') {
        stringData[key] = JSON.stringify(value);
      } else {
        stringData[key] = String(value);
      }
    }

    return stringData;
  }

  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(dto: SendNotificationDto, scheduledFor: Date): Promise<Notification> {
    const scheduledDto = {
      ...dto,
      data: {
        ...(dto.data || {}),
        scheduledFor: scheduledFor.toISOString(),
        deliveryMode: 'pending_record_only',
        queueWorkerConfigured: false,
      },
    };

    // Create a visible pending record only. No worker consumes this record yet.
    const notification = await this.createNotificationRecord(scheduledDto, NotificationStatus.PENDING);

    this.logger.warn(
      `Notification schedule request stored as pending_record_only for ${scheduledFor.toISOString()} (user: ${dto.userId}); no queue worker is configured.`,
    );

    return notification;
  }
}
