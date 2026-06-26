/**
 * Real-Time Cost Service Tests
 * Comprehensive test suite for WebSocket and real-time cost tracking
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RealTimeCostService from '../services/realtime/RealTimeCostService';

// Mock WebSocket
global.WebSocket = vi.fn();

describe('RealTimeCostService', () => {
  let service;
  let mockWs;
  let consoleWarnSpy;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    service = new RealTimeCostService();

    // Mock WebSocket
    mockWs = {
      readyState: 1,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
    };

    global.WebSocket = vi.fn(() => mockWs);
  });

  afterEach(() => {
    if (service) {
      service.disconnect();
    }
    consoleWarnSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Cost Updates', () => {
    it('should handle cost update from server', () => {
      const listener = vi.fn();
      service.onCostUpdate(listener);

      const update = {
        toolId: 'drug-checker',
        cost: 25.5,
        timestamp: new Date().toISOString(),
        executionCount: 5,
      };

      service.handleCostUpdate(update);

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        toolId: 'drug-checker',
        cost: 25.5,
      }));
    });

    it('should accumulate costs correctly', () => {
      const listener = vi.fn();
      service.onCostUpdate(listener);

      service.handleCostUpdate({
        toolId: 'drug-checker',
        cost: 10,
        timestamp: new Date().toISOString(),
      });

      service.handleCostUpdate({
        toolId: 'drug-checker',
        cost: 15,
        timestamp: new Date().toISOString(),
      });

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe from cost updates', () => {
      const listener = vi.fn();
      const unsubscribe = service.onCostUpdate(listener);

      service.handleCostUpdate({
        toolId: 'drug-checker',
        cost: 10,
        timestamp: new Date().toISOString(),
      });

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      service.handleCostUpdate({
        toolId: 'drug-checker',
        cost: 10,
        timestamp: new Date().toISOString(),
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cost Alerts', () => {
    it('should handle cost alerts', () => {
      const listener = vi.fn();
      service.onCostAlert(listener);

      const alert = {
        type: 'APPROACHING',
        toolId: 'drug-checker',
        currentCost: 800,
        limitCost: 1000,
        riskLevel: 'warning',
        message: 'Cost approaching limit',
        timestamp: new Date().toISOString(),
      };

      service.handleCostAlert(alert);

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'APPROACHING',
        riskLevel: 'warning',
      }));
    });

    it('should identify critical alerts', () => {
      const listener = vi.fn();
      service.onCostAlert(listener);

      service.handleCostAlert({
        type: 'CRITICAL',
        toolId: 'sofa-calculator',
        currentCost: 1500,
        limitCost: 1000,
        riskLevel: 'critical',
        message: 'Cost critical',
        timestamp: new Date().toISOString(),
      });

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        riskLevel: 'critical',
      }));
    });

    it('should queue multiple alerts', () => {
      const listener = vi.fn();
      service.onCostAlert(listener);

      const alert1 = {
        type: 'APPROACHING',
        toolId: 'tool1',
        riskLevel: 'warning',
        message: 'Tool 1 alert',
        timestamp: new Date().toISOString(),
      };

      const alert2 = {
        type: 'EXCEEDED',
        toolId: 'tool2',
        riskLevel: 'critical',
        message: 'Tool 2 alert',
        timestamp: new Date().toISOString(),
      };

      service.handleCostAlert(alert1);
      service.handleCostAlert(alert2);

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('Batch Processing', () => {
    it('should calculate batch statistics', () => {
      const updates = [
        { toolId: 'tool1', cost: 100, timestamp: new Date() },
        { toolId: 'tool2', cost: 150, timestamp: new Date() },
        { toolId: 'tool3', cost: 200, timestamp: new Date() },
      ];

      const stats = service.calculateBatchStats(updates);

      expect(stats.count).toBe(3);
      expect(stats.totalCost).toBe(450);
      expect(stats.averageCost).toBe(150);
      expect(stats.highestCost).toBe(200);
    });

    it('should identify high cost tools in batch', () => {
      const updates = [
        { toolId: 'cheap', cost: 50, timestamp: new Date() },
        { toolId: 'expensive', cost: 500, timestamp: new Date() },
      ];

      const stats = service.calculateBatchStats(updates);

      expect(stats.highCostTools).toContain('expensive');
      expect(stats.highCostTools).not.toContain('cheap');
    });

    it('should process batch when queue exceeds limit', () => {
      const sendAnalyticsEvent = vi.spyOn(service, 'sendAnalyticsEvent');

      // Add 10 updates to trigger batch processing
      for (let i = 0; i < 10; i++) {
        service.handleCostUpdate({
          toolId: `tool${i}`,
          cost: 50,
          timestamp: new Date().toISOString(),
        });
      }

      expect(sendAnalyticsEvent).toHaveBeenCalled();
    });
  });

  describe('Trending Tools', () => {
    it('should handle trending tools update', () => {
      service.handleTrendingTools({
        tools: [
          { name: 'drug-checker', growth: 25 },
          { name: 'lab-interpreter', growth: 18 },
        ],
        period: '24h',
        topCount: 2,
      });

      const trending = service.getTrendingTools('24h');

      expect(trending).toHaveLength(2);
      expect(trending[0].name).toBe('drug-checker');
    });

    it('should request trending analysis', () => {
      service.wsManager = { send: vi.fn() };

      service.requestTrendingAnalysis('24h', 5);

      expect(service.wsManager.send).toHaveBeenCalledWith(
        'REQUEST_TRENDING_TOOLS',
        expect.objectContaining({
          period: '24h',
          topCount: 5,
        })
      );
    });
  });

  describe('Statistics', () => {
    it('should return service statistics', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('isConnected');
      expect(stats).toHaveProperty('pendingUpdates');
      expect(stats).toHaveProperty('activeListeners');
      expect(stats).toHaveProperty('cachedTrends');
    });

    it('should track active listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      service.onCostUpdate(listener1);
      service.onCostUpdate(listener2);
      service.onCostAlert(listener3);

      const stats = service.getStats();

      expect(stats.activeListeners).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Collaboration Events', () => {
    it('should send collaboration event', () => {
      service.wsManager = { sendCollaborationEvent: vi.fn() };

      service.sendCollaborationEvent('workspace_update', {
        workspaceId: 'ws-123',
        changes: { color: 'blue' },
      });

      expect(service.wsManager.sendCollaborationEvent).toHaveBeenCalled();
    });

    it('should broadcast cost update', () => {
      service.wsManager = { sendCostUpdate: vi.fn() };

      service.broadcastCostUpdate('drug-checker', 50, { userId: 'user-1' });

      expect(service.wsManager.sendCostUpdate).toHaveBeenCalledWith(
        'drug-checker',
        50,
        expect.objectContaining({ userId: 'user-1' })
      );
    });
  });

  describe('Cleanup', () => {
    it('should disconnect and cleanup', () => {
      const listener = vi.fn();
      service.onCostUpdate(listener);
      service.onCostAlert(listener);

      service.disconnect();

      expect(service.costListeners).toHaveLength(0);
      expect(service.alertListeners).toHaveLength(0);
      expect(service.costUpdateQueue).toHaveLength(0);
    });
  });
});
