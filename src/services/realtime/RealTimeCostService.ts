/**
 * Real-Time Cost Tracking Service
 * Provides live cost updates, trending, and alerts via WebSocket
 */

import { getWebSocketManager } from '../websocket/WebSocketManager';

class RealTimeCostService {
  wsManager: any;
  costListeners: any[];
  alertListeners: any[];
  trendingToolsCache: Map<string, any>;
  costUpdateQueue: any[];
  isProcessing: boolean;

  constructor() {
    this.wsManager = null;
    this.costListeners = [] as any[];
    this.alertListeners = [] as any[];
    this.trendingToolsCache = new Map();
    this.costUpdateQueue = [] as any[];
    this.isProcessing = false;
  }

  /**
   * Initialize real-time service
   */
  async initialize(token, wsBaseUrl) {
    this.wsManager = getWebSocketManager(wsBaseUrl);
    await this.wsManager.connect(token);

    // Subscribe to cost update events
    this.wsManager.subscribe('COST_UPDATE', (payload) => {
      this.handleCostUpdate(payload);
    });

    // Subscribe to cost alert events
    this.wsManager.subscribe('COST_ALERT', (payload) => {
      this.handleCostAlert(payload);
    });

    // Subscribe to trending tools
    this.wsManager.subscribe('TRENDING_TOOLS', (payload) => {
      this.handleTrendingTools(payload);
    });
  }

  /**
   * Handle incoming cost update
   */
  handleCostUpdate(payload) {
    const { toolId, cost, timestamp, executionCount, roiMetrics } = payload;

    const update = {
      toolId,
      cost,
      timestamp: new Date(timestamp),
      executionCount,
      roiMetrics,
      receivedAt: new Date(),
    };

    // Add to queue for batch processing
    this.costUpdateQueue.push(update);

    // Notify listeners immediately
    this.costListeners.forEach((listener) => {
      try {
        listener(update);
      } catch (error: any) {
        console.error('[RealTimeCostService] Listener error:', error);
      }
    });

    // Process batch if needed
    if (this.costUpdateQueue.length >= 10) {
      this.processCostUpdateBatch();
    }
  }

  /**
   * Handle cost alert
   */
  handleCostAlert(payload) {
    const { type, toolId, currentCost, limitCost, riskLevel, message } = payload;

    const alert = {
      type, // 'APPROACHING', 'EXCEEDED', 'CRITICAL'
      toolId,
      currentCost,
      limitCost,
      riskLevel, // 'warning', 'critical'
      message,
      timestamp: new Date(),
      id: `alert-${Date.now()}-${Math.random()}`,
    };

    // Notify alert listeners
    this.alertListeners.forEach((listener) => {
      try {
        listener(alert);
      } catch (error: any) {
        console.error('[RealTimeCostService] Alert listener error:', error);
      }
    });

    // Log alert
    console.warn('[RealTimeCostService] Alert:', alert);
  }

  /**
   * Handle trending tools update
   */
  handleTrendingTools(payload) {
    const { tools, period, topCount } = payload;

    this.trendingToolsCache.set(period, {
      tools,
      topCount,
      updatedAt: new Date(),
    });
  }

  /**
   * Process batch of cost updates
   */
  async processCostUpdateBatch() {
    if (this.isProcessing || this.costUpdateQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = [...this.costUpdateQueue];
    this.costUpdateQueue = [] as any[];

    try {
      // Calculate batch statistics
      const stats = this.calculateBatchStats(batch);

      // Send analytics event if significant changes
      if (stats.totalCost > 100 || stats.highRiskTools.length > 0) {
        await this.sendAnalyticsEvent(stats);
      }
    } catch (error: any) {
      console.error('[RealTimeCostService] Batch processing error:', error);
      // Re-queue for retry
      this.costUpdateQueue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Calculate batch statistics
   */
  calculateBatchStats(updates) {
    const stats = {
      count: updates.length,
      totalCost: 0,
      averageCost: 0,
      highestCost: 0,
      highCostTools: [],
      highRiskTools: [],
      timeRange: null,
    };

    if (updates.length === 0) return stats;

    const costs = updates.map((u) => u.cost);
    stats.totalCost = costs.reduce((sum, cost) => sum + cost, 0);
    stats.averageCost = stats.totalCost / updates.length;
    stats.highestCost = Math.max(...costs);

    stats.highCostTools = updates
      .filter((u) => u.cost > stats.averageCost * 1.5)
      .map((u) => u.toolId);

    stats.highRiskTools = updates
      .filter((u) => u.roiMetrics && u.roiMetrics.roi < 0)
      .map((u) => u.toolId);

    const timestamps = updates.map((u) => u.timestamp);
    (stats as any).timeRange = {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };

    return stats;
  }

  /**
   * Send analytics event for batch
   */
  async sendAnalyticsEvent(stats) {
    if (!this.wsManager) {
      return;
    }

    this.wsManager.send('ANALYTICS_EVENT', {
      eventType: 'COST_BATCH_UPDATE',
      stats,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Subscribe to cost updates
   */
  onCostUpdate(listener) {
    this.costListeners.push(listener);
    return () => {
      const index = this.costListeners.indexOf(listener);
      if (index > -1) {
        this.costListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to cost alerts
   */
  onCostAlert(listener) {
    this.alertListeners.push(listener);
    return () => {
      const index = this.alertListeners.indexOf(listener);
      if (index > -1) {
        this.alertListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get trending tools
   */
  getTrendingTools(period = '24h') {
    const cached = this.trendingToolsCache.get(period);
    if (cached) {
      return cached.tools;
    }
    return [];
  }

  /**
   * Request trending analysis
   */
  requestTrendingAnalysis(period = '24h', topCount = 5) {
    if (!this.wsManager) {
      return;
    }

    this.wsManager.send('REQUEST_TRENDING_TOOLS', {
      period,
      topCount,
    });
  }

  /**
   * Broadcast cost update to collaborators
   */
  broadcastCostUpdate(toolId, cost, metadata: any = {}) {
    if (!this.wsManager) {
      return;
    }

    this.wsManager.sendCostUpdate(toolId, cost, metadata);
  }

  /**
   * Send collaboration event (for multi-user workspaces)
   */
  sendCollaborationEvent(eventType, data) {
    if (!this.wsManager) {
      return;
    }

    this.wsManager.sendCollaborationEvent(eventType, data);
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      isConnected: this.wsManager ? this.wsManager.isConnected : false,
      pendingUpdates: this.costUpdateQueue.length,
      activeListeners: this.costListeners.length + this.alertListeners.length,
      cachedTrends: this.trendingToolsCache.size,
    };
  }

  /**
   * Disconnect service
   */
  disconnect() {
    if (this.wsManager && typeof this.wsManager.disconnect === 'function') {
      this.wsManager.disconnect();
    }
    this.costListeners = [] as any[];
    this.alertListeners = [] as any[];
    this.costUpdateQueue = [] as any[];
    this.trendingToolsCache.clear();
  }
}

// Singleton instance
let instance: any = null;

export function getRealTimeCostService() {
  if (!instance) {
    instance = new RealTimeCostService();
  }
  return instance;
}

export default RealTimeCostService;
