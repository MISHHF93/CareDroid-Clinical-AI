import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { User } from '../../users/entities/user.entity';

export class ToggleAllNotificationsDto {
  @IsBoolean()
  enabled: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  emergencyAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  medicationReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  appointmentReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  labResults?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingCommunications?: boolean;

  @IsOptional()
  @IsBoolean()
  securityAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  systemUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;
}

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
  ) {}

  /**
   * Get or create notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  /**
   * Create default notification preferences
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    const preferences = this.preferenceRepository.create({
      user: { id: userId } as User,
      emergencyAlerts: true,
      medicationReminders: true,
      appointmentReminders: true,
      labResults: true,
      marketingCommunications: false,
      securityAlerts: true,
      systemUpdates: true,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      quietHoursEnabled: false,
    });

    return await this.preferenceRepository.save(preferences);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<NotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    // Update preferences
    Object.assign(preferences, dto);

    const updated = await this.preferenceRepository.save(preferences);

    this.logger.log(`Updated notification preferences for user ${userId}`);

    return updated;
  }

  /**
   * Check if user can receive a specific notification type
   */
  async canReceiveNotification(userId: string, notificationType: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    // Always allow emergency notifications
    if (notificationType === 'emergency') {
      return preferences.emergencyAlerts;
    }

    // Check if push notifications are enabled
    if (!preferences.pushEnabled) {
      return false;
    }

    // Check specific notification type
    const typeMap: Record<string, boolean> = {
      medication_reminder: preferences.medicationReminders,
      appointment_reminder: preferences.appointmentReminders,
      lab_result: preferences.labResults,
      security_alert: preferences.securityAlerts,
      system_update: preferences.systemUpdates,
      general: true, // Always allow general notifications if push is enabled
    };

    const allowed = typeMap[notificationType] ?? true;

    // Check quiet hours
    if (allowed && preferences.quietHoursEnabled && notificationType !== 'emergency') {
      const isQuietTime = this.isWithinQuietHours(
        preferences.quietHoursStart,
        preferences.quietHoursEnd,
      );

      if (isQuietTime) {
        this.logger.log(`Notification blocked for user ${userId} due to quiet hours`);
        return false;
      }
    }

    return allowed;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isWithinQuietHours(start: string, end: string): boolean {
    if (!start || !end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime < endTime) {
      // Normal case: quiet hours don't cross midnight
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours cross midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Enable/disable all notifications for a user
   */
  async toggleAllNotifications(userId: string, enabled: boolean): Promise<void> {
    const preferences = await this.getPreferences(userId);

    preferences.pushEnabled = enabled;
    preferences.emailEnabled = enabled;
    preferences.smsEnabled = enabled;

    await this.preferenceRepository.save(preferences);

    this.logger.log(`${enabled ? 'Enabled' : 'Disabled'} all notifications for user ${userId}`);
  }

  /**
   * Delete preferences (GDPR compliance)
   */
  async deletePreferences(userId: string): Promise<void> {
    await this.preferenceRepository.delete({ user: { id: userId } });

    this.logger.log(`Deleted notification preferences for user ${userId}`);
  }
}
