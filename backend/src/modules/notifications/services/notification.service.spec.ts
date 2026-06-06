import { NotificationStatus, NotificationType } from '../entities/notification.entity';
import { NotificationService } from './notification.service';

describe('NotificationService scheduling', () => {
  it('stores scheduled notifications as pending records without implying queued delivery', async () => {
    const notificationRepository = {
      create: jest.fn((record) => record),
      save: jest.fn((record) => Promise.resolve({ id: 'notification-1', ...record })),
    };
    const service = new NotificationService(
      notificationRepository as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const scheduledFor = new Date('2026-06-06T18:30:00.000Z');
    const result = await service.scheduleNotification(
      {
        userId: 'user-1',
        type: NotificationType.GENERAL,
        title: 'Maintenance due',
        body: 'Telemetry gateway needs calibration.',
        data: { source: 'device-maintenance' },
      },
      scheduledFor,
    );

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: NotificationStatus.PENDING,
        data: expect.objectContaining({
          source: 'device-maintenance',
          scheduledFor: scheduledFor.toISOString(),
          deliveryMode: 'pending_record_only',
          queueWorkerConfigured: false,
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 'notification-1' }));
  });
});
