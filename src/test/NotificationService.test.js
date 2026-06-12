/**
 * Notification Service Tests
 * Comprehensive test suite for notification system
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import NotificationService, {
  LEGACY_NOTIFICATION_SERVICE_STATUS,
} from '../services/notifications/NotificationService';

describe('NotificationService', () => {
  let service;

  beforeEach(() => {
    service = new NotificationService('http://localhost:3000/api');
    service.userId = 'user-123';
    service.token = 'test-token';
    service.isProcessing = true;
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ messageId: 'test' }),
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('is retained as a legacy queue-style compatibility client', () => {
    expect(LEGACY_NOTIFICATION_SERVICE_STATUS).toMatchObject({
      activeClient: false,
      replacement: 'src/services/NotificationService.js',
      blockedCapability: 'notificationSendChannel',
    });
  });

  describe('Cost Alerts', () => {
    it('should send cost alert notification', async () => {
      const queueSpy = vi.spyOn(service, 'queueNotification');

      await service.sendCostAlert('drug-checker', 800, 1000, 'APPROACHING');

      expect(queueSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'COST_ALERT',
        alertType: 'APPROACHING',
        toolId: 'drug-checker',
      }));
    });

    it('should detect alert severity levels', async () => {
      await service.sendCostAlert(
        'tool1',
        800,
        1000,
        'APPROACHING'
      );
      await service.sendCostAlert(
        'tool2',
        1200,
        1000,
        'EXCEEDED'
      );
      await service.sendCostAlert(
        'tool3',
        2500,
        1000,
        'CRITICAL'
      );

      expect(service.notificationQueue).toHaveLength(3);
      expect(service.notificationQueue[0].alertType).toBe('APPROACHING');
      expect(service.notificationQueue[1].alertType).toBe('EXCEEDED');
      expect(service.notificationQueue[2].alertType).toBe('CRITICAL');
    });

    it('should set correct channels for cost alerts', async () => {
      service.preferences.emailEnabled = true;
      service.preferences.smsEnabled = false;
      service.preferences.inAppEnabled = true;

      await service.sendCostAlert('tool1', 800, 1000);

      const notification = service.notificationQueue[0];
      expect(notification.channels).toContain('email');
      expect(notification.channels).toContain('inApp');
      expect(notification.channels).not.toContain('sms');
    });
  });

  describe('Recommendation Alerts', () => {
    it('should send recommendation alert', async () => {
      const recommendations = [
        { id: 'drug-checker', name: 'Drug Checker' },
        { id: 'lab-interpreter', name: 'Lab Interpreter' },
      ];

      await service.sendRecommendationAlert(recommendations, 'cost_saving');

      expect(service.notificationQueue).toHaveLength(1);
      expect(service.notificationQueue[0].type).toBe('RECOMMENDATION_ALERT');
    });

    it('should categorize recommendations by reason', async () => {
      const recs = [{ id: 'tool1', name: 'Tool 1' }];

      await service.sendRecommendationAlert(recs, 'cost_saving');
      await service.sendRecommendationAlert(recs, 'clinical_need');
      await service.sendRecommendationAlert(recs, 'usage_pattern');

      expect(service.notificationQueue).toHaveLength(3);
      expect(service.notificationQueue[0].reason).toBe('cost_saving');
      expect(service.notificationQueue[1].reason).toBe('clinical_need');
      expect(service.notificationQueue[2].reason).toBe('usage_pattern');
    });
  });

  describe('Emergency Alerts', () => {
    it('should send emergency alert', async () => {
      await service.sendEmergencyAlert('Critical issue detected', 'critical');

      expect(service.notificationQueue).toHaveLength(1);
      expect(service.notificationQueue[0].type).toBe('EMERGENCY_ALERT');
    });

    it('should always include in-app for emergency alerts', async () => {
      service.preferences.emailEnabled = false;
      service.preferences.smsEnabled = false;
      service.preferences.inAppEnabled = true;

      await service.sendEmergencyAlert('Critical', 'critical');

      const notification = service.notificationQueue[0];
      expect(notification.channels).toContain('inApp');
    });

    it('should enable SMS for critical emergencies', async () => {
      service.preferences.smsEnabled = true;
      service.preferences.emergencyAlerts = true;

      await service.sendEmergencyAlert('Critical', 'critical');

      const notification = service.notificationQueue[0];
      expect(notification.channels).toContain('sms');
    });
  });

  describe('Notification Preferences', () => {
    it('should update preferences', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({}),
        })
      );

      const success = await service.updatePreferences({
        emailEnabled: false,
        smsEnabled: true,
      });

      expect(success).toBe(true);
      expect(service.preferences.emailEnabled).toBe(false);
      expect(service.preferences.smsEnabled).toBe(true);
    });

    it('should respect preference settings', async () => {
      service.preferences.emailEnabled = false;
      service.preferences.inAppEnabled = true;

      await service.sendCostAlert('tool1', 800, 1000);

      const notification = service.notificationQueue[0];
      expect(notification.channels).not.toContain('email');
      expect(notification.channels).toContain('inApp');
    });

    it('should disable alert types when disabled', async () => {
      service.preferences.costAlerts = false;
      service.preferences.emailEnabled = true;

      await service.sendCostAlert('tool1', 800, 1000);

      const notification = service.notificationQueue[0];
      expect(notification.channels).not.toContain('email');
    });
  });

  describe('Message Formatting', () => {
    it('should format cost alert message for APPROACHING', () => {
      const notification = {
        alertType: 'APPROACHING',
        toolId: 'drug-checker',
        currentCost: 800,
        limitCost: 1000,
        percentage: 80,
      };

      const message = service.formatCostAlertMessage(notification);

      expect(message).toContain('approaching');
      expect(message).toContain('drug-checker');
      expect(message).toContain('800');
      expect(message).toContain('1000');
    });

    it('should format recommendation message', () => {
      const notification = {
        reason: 'cost_saving',
        recommendations: [
          { name: 'Tool 1' },
          { name: 'Tool 2' },
        ],
      };

      const message = service.formatRecommendationMessage(notification);

      expect(message).toContain('optimize costs');
      expect(message).toContain('Tool 1');
      expect(message).toContain('Tool 2');
    });
  });

  describe('History Management', () => {
    it('should maintain notification history', async () => {
      service.notificationHistory.push({
        id: 'history-1',
        type: 'COST_ALERT',
        timestamp: new Date(),
      });

      const history = service.getHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history to 100 items', async () => {
      for (let i = 0; i < 150; i++) {
        service.notificationHistory.push({
          id: `notif-${i}`,
          type: 'COST_ALERT',
          timestamp: new Date(),
        });
      }

      const history = service.getHistory(100);
      expect(history.length).toBe(100);
    });

    it('should filter history by type', async () => {
      service.notificationHistory = [
        { id: '1', type: 'COST_ALERT', timestamp: new Date() },
        { id: '2', type: 'RECOMMENDATION_ALERT', timestamp: new Date() },
        { id: '3', type: 'COST_ALERT', timestamp: new Date() },
      ];

      const costAlerts = service.getHistory(100, 'COST_ALERT');

      expect(costAlerts).toHaveLength(2);
      expect(costAlerts.every((n) => n.type === 'COST_ALERT')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should return service statistics', () => {
      service.notificationQueue.push({
        id: 'test',
        type: 'COST_ALERT',
      });

      const stats = service.getStats();

      expect(stats).toHaveProperty('queueLength');
      expect(stats).toHaveProperty('historyCount');
      expect(stats).toHaveProperty('isProcessing');
      expect(stats).toHaveProperty('preferences');
      expect(stats.queueLength).toBe(1);
    });
  });

  describe('Channel Payload Building', () => {
    it('should build email payload', () => {
      const notification = {
        id: 'test-1',
        type: 'COST_ALERT',
        alertType: 'APPROACHING',
        toolId: 'drug-checker',
        currentCost: 800,
        limitCost: 1000,
        percentage: 80,
      };

      const payload = service.buildChannelPayload('email', notification);

      expect(payload).toHaveProperty('subject');
      expect(payload).toHaveProperty('body');
      expect(payload.subject).toContain('Cost Alert');
      expect(payload.data).toHaveProperty('alertType');
    });

    it('should build SMS payload', () => {
      const notification = {
        id: 'test-1',
        type: 'EMERGENCY_ALERT',
        message: 'Critical issue',
        severity: 'critical',
      };

      const payload = service.buildChannelPayload('sms', notification);

      expect(payload).toHaveProperty('subject');
      expect(payload).toHaveProperty('body');
      expect(payload.body).toContain('Critical');
    });
  });

  describe('Queue Processing', () => {
    it('should queue notifications', async () => {
      await service.sendCostAlert('tool1', 100, 1000);
      await service.sendCostAlert('tool2', 200, 1000);

      expect(service.notificationQueue.length).toBeGreaterThanOrEqual(2);
    });

    it('should prevent duplicate processing', async () => {
      vi.spyOn(service, 'processQueue');

      // Add multiple notifications quickly
      await service.sendCostAlert('tool1', 100, 1000);

      // Should only process once due to isProcessing flag
      expect(service.isProcessing).toBeDefined();
    });
  });
});
