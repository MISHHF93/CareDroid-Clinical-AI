import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './services/notification.service';
import { DeviceTokenService, RegisterDeviceDto } from './services/device-token.service';
import {
  NotificationPreferenceService,
  UpdatePreferencesDto,
} from './services/notification-preference.service';
import { DevicePlatform } from './entities/device-token.entity';
import { NotificationType } from './entities/notification.entity';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private deviceTokenService: DeviceTokenService,
    private preferenceService: NotificationPreferenceService,
  ) {}

  /**
   * Register device for push notifications
   */
  @Post('devices/register')
  @ApiOperation({ summary: 'Register device for push notifications' })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  async registerDevice(@Request() req, @Body() dto: RegisterDeviceDto) {
    const device = await this.deviceTokenService.registerDeviceToken(req.user, dto);

    return {
      success: true,
      message: 'Device registered successfully',
      deviceId: device.id,
    };
  }

  /**
   * Get user's registered devices
   */
  @Get('devices')
  @ApiOperation({ summary: 'Get registered devices' })
  async getDevices(@Request() req) {
    const devices = await this.deviceTokenService.getUserDeviceTokens(req.user.id);

    return {
      success: true,
      devices: devices.map((d) => ({
        id: d.id,
        platform: d.platform,
        deviceModel: d.deviceModel,
        osVersion: d.osVersion,
        appVersion: d.appVersion,
        lastUsedAt: d.lastUsedAt,
        createdAt: d.createdAt,
      })),
    };
  }

  /**
   * Remove device token
   */
  @Delete('devices/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove device token' })
  async removeDevice(@Request() req, @Param('token') tokenOrDeviceId: string) {
    await this.deviceTokenService.removeDeviceToken(req.user.id, tokenOrDeviceId);
    return { success: true };
  }

  /**
   * Get notification preferences
   */
  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Request() req) {
    const preferences = await this.preferenceService.getPreferences(req.user.id);

    return {
      success: true,
      preferences: {
        emergencyAlerts: preferences.emergencyAlerts,
        medicationReminders: preferences.medicationReminders,
        appointmentReminders: preferences.appointmentReminders,
        labResults: preferences.labResults,
        marketingCommunications: preferences.marketingCommunications,
        securityAlerts: preferences.securityAlerts,
        systemUpdates: preferences.systemUpdates,
        pushEnabled: preferences.pushEnabled,
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
      },
    };
  }

  /**
   * Update notification preferences
   */
  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(@Request() req, @Body() dto: UpdatePreferencesDto) {
    const preferences = await this.preferenceService.updatePreferences(req.user.id, dto);

    return {
      success: true,
      message: 'Preferences updated successfully',
      preferences,
    };
  }

  /**
   * Toggle all notifications
   */
  @Post('preferences/toggle-all')
  @ApiOperation({ summary: 'Enable/disable all notifications' })
  async toggleAllNotifications(@Request() req, @Body() body: { enabled: boolean }) {
    await this.preferenceService.toggleAllNotifications(req.user.id, body.enabled);

    return {
      success: true,
      message: `Notifications ${body.enabled ? 'enabled' : 'disabled'}`,
    };
  }

  /**
   * Get user notifications
   */
  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @Request() req,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const { notifications, total } = await this.notificationService.getUserNotifications(
      req.user.id,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );

    return {
      success: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        status: n.status,
        sentAt: n.sentAt,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    };
  }

  /**
   * Get unread notification count
   */
  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req) {
    const count = await this.notificationService.getUnreadCount(req.user.id);

    return {
      success: true,
      count,
    };
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Request() req, @Param('id') id: string) {
    await this.notificationService.markAsRead(id, req.user.id);

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  /**
   * Mark all notifications as read
   */
  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req) {
    await this.notificationService.markAllAsRead(req.user.id);

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  /**
   * Delete notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(@Request() req, @Param('id') id: string) {
    await this.notificationService.deleteNotification(id, req.user.id);
    return { success: true };
  }

  /**
   * Send test notification
   */
  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  async sendTestNotification(@Request() req) {
    const notification = await this.notificationService.sendNotification({
      userId: req.user.id,
      type: NotificationType.GENERAL,
      title: 'Test Notification',
      body: 'This is a test notification from CareDroid-Clinical-AI',
      priority: 'normal',
    });

    return {
      success: true,
      message: 'Test notification sent',
      notificationId: notification.id,
    };
  }
}
