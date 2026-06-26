/**
 * Sync Service - Handles synchronization between offline storage and backend
 * NOTE: Requires dexie library - install with: npm install dexie
 */
import { db } from '../db/offline.db';
import offlineService from './offlineService';
import { apiFetch } from './apiClient';
import { AUTH_CONFIG } from '../config/auth.config';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { recordAutomationBlocked, recordAutomationFailure } from './automationAuditLogger';
import { makeDisabledCapabilityResponse } from './disabledBackendMocks';
import { reportApiError } from './apiErrorHandling';
import logger from '../utils/logger';

class SyncService {
  isSyncing: boolean;
  syncInterval: ReturnType<typeof setInterval> | null;
  initialized: boolean;
  AUTO_SYNC_INTERVAL: number;

  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.initialized = false;
    this.AUTO_SYNC_INTERVAL = 30000; // 30 seconds
  }

  /**
   * Initialize sync service
   */
  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Start periodic sync if online
    if (navigator.onLine) {
      this.startAutoSync();
    }

    logger.info('SyncService initialized');
  }

  /**
   * Handle coming online
   */
  handleOnline() {
    logger.info('Connection restored - starting sync');
    this.syncAll();
    this.startAutoSync();
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    logger.info('Connection lost - stopping auto-sync');
    this.stopAutoSync();
  }

  /**
   * Start automatic syncing
   */
  startAutoSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncAll();
      }
    }, this.AUTO_SYNC_INTERVAL);

    logger.info('Auto-sync started');
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Auto-sync stopped');
    }
  }

  /**
   * Sync all unsynced data
   */
  async syncAll() {
    if (this.isSyncing) {
      logger.info('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      logger.info('Cannot sync - offline');
      return;
    }

    this.isSyncing = true;

    try {
      const token = localStorage.getItem(AUTH_CONFIG.tokenStorageKey);
      if (!token) {
        logger.info('No auth token - skipping sync');
        this.isSyncing = false;
        return;
      }

      logger.info('Starting full sync');

      // Get all unsynced items
      const unsynced = await offlineService.getUnsyncedItems();
      logger.info(`Found ${unsynced.total} unsynced items`);

      if (unsynced.total === 0) {
        await this.downloadLatestData(token);
        this.isSyncing = false;
        return;
      }

      // Sync messages
      await this.syncMessages(unsynced.messages, token);

      // Sync conversations
      await this.syncConversations(unsynced.conversations, token);

      // Sync tool results
      await this.syncToolResults(unsynced.toolResults, token);

      // Sync notifications
      await this.syncNotifications(unsynced.notifications, token);

      // Sync audit logs
      await this.syncAuditLogs(unsynced.auditLogs, token);

      logger.info('Full sync completed successfully');

      // Download latest data from server
      await this.downloadLatestData(token);
    } catch (error: any) {
      logger.error('Sync failed', { error });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync messages
   */
  async syncMessages(messages, token) {
    if (messages.length === 0) return;
    if (!isBackendCapabilityEnabled('chatPersistence')) {
      logger.info('Skipping message sync — chat persistence API not available on server');
      const fallback = makeDisabledCapabilityResponse('chatPersistence', '/api/chat/messages', {
        synced: 0,
        queued: messages.length,
      } as any);
      await recordAutomationBlocked({
        triggerFired: 'Offline message sync requested',
        conditionsEvaluated: [{ label: 'Chat persistence backend capability enabled', result: false }],
        actionSelected: 'Sync offline chat messages',
        toolCalled: 'offline-sync',
        backendEndpoint: '/api/chat/messages',
        reason: 'Chat persistence API is not available on this server.',
      });
      reportApiError({
        title: 'Chat message sync unavailable',
        message: fallback.message,
        endpoint: '/api/chat/messages',
      });
      return fallback;
    }

    logger.info(`Syncing ${messages.length} messages`);

    for (const message of messages) {
      try {
        const response = await apiFetch(
          '/api/chat/messages',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              conversationId: message.conversationId,
              content: message.content,
              role: message.role,
              timestamp: message.timestamp,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to sync message: ${response.status}`);
        }

        const data = await response.json();

        // Mark as synced
        await offlineService.markAsSynced('messages', message.id);

        // Update with server ID if needed
        if (data.id) {
          await db.messages.update(message.id, { serverId: data.id });
        }
      } catch (error: any) {
        logger.error(`Failed to sync message ${message.id}`, { error });
        await recordAutomationFailure({
          triggerFired: 'Offline message sync failed',
          actionSelected: 'Sync offline chat message',
          toolCalled: 'offline-sync',
          backendEndpoint: '/api/chat/messages',
          error,
        });
      }
    }

    logger.info('Messages synced');
  }

  /**
   * Sync conversations
   */
  async syncConversations(conversations, token) {
    if (conversations.length === 0) return;
    if (!isBackendCapabilityEnabled('chatPersistence')) {
      logger.info('Skipping conversation sync — chat persistence API not available on server');
      const fallback = makeDisabledCapabilityResponse('chatPersistence', '/api/chat/conversations', {
        synced: 0,
        queued: conversations.length,
      } as any);
      await recordAutomationBlocked({
        triggerFired: 'Offline conversation sync requested',
        conditionsEvaluated: [{ label: 'Chat persistence backend capability enabled', result: false }],
        actionSelected: 'Sync offline conversations',
        toolCalled: 'offline-sync',
        backendEndpoint: '/api/chat/conversations',
        reason: 'Chat persistence API is not available on this server.',
      });
      reportApiError({
        title: 'Chat conversation sync unavailable',
        message: fallback.message,
        endpoint: '/api/chat/conversations',
      });
      return fallback;
    }

    logger.info(`Syncing ${conversations.length} conversations`);

    for (const conversation of conversations) {
      try {
        const response = await apiFetch(
          '/api/chat/conversations',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: conversation.userId,
              title: conversation.title,
              lastMessageAt: conversation.lastMessageAt,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to sync conversation: ${response.status}`);
        }

        const data = await response.json();

        await offlineService.markAsSynced('conversations', conversation.id);

        if (data.id) {
          await db.conversations.update(conversation.id, { serverId: data.id });
        }
      } catch (error: any) {
        logger.error(`Failed to sync conversation ${conversation.id}`, { error });
        await recordAutomationFailure({
          triggerFired: 'Offline conversation sync failed',
          actionSelected: 'Sync offline conversation',
          toolCalled: 'offline-sync',
          backendEndpoint: '/api/chat/conversations',
          error,
        });
      }
    }

    logger.info('Conversations synced');
  }

  /**
   * Sync tool results
   */
  async syncToolResults(toolResults, token) {
    if (toolResults.length === 0) return;
    if (!isBackendCapabilityEnabled('toolsResultsSync')) {
      logger.info('Skipping tool results sync — tools results API not available on server');
      await recordAutomationBlocked({
        triggerFired: 'Offline tool result sync requested',
        conditionsEvaluated: [{ label: 'Tool results sync backend capability enabled', result: false }],
        actionSelected: 'Sync offline tool results',
        toolCalled: 'offline-sync',
        backendEndpoint: '/api/tools/results',
        reason: 'Tool results sync API is not available on this server.',
      });
      return;
    }

    logger.info(`Syncing ${toolResults.length} tool results`);

    for (const result of toolResults) {
      try {
        const response = await apiFetch(
          '/api/tools/results',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              toolType: result.toolType,
              input: result.input,
              output: result.output,
              timestamp: result.timestamp,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to sync tool result: ${response.status}`);
        }

        await offlineService.markAsSynced('toolResults', result.id);
      } catch (error: any) {
        logger.error(`Failed to sync tool result ${result.id}`, { error });
        await recordAutomationFailure({
          triggerFired: 'Offline tool result sync failed',
          actionSelected: 'Sync offline tool result',
          toolCalled: 'offline-sync',
          backendEndpoint: '/api/tools/results',
          error,
        });
      }
    }

    logger.info('Tool results synced');
  }

  /**
   * Sync notifications
   */
  async syncNotifications(notifications, token) {
    if (notifications.length === 0) return;

    logger.info(`Syncing ${notifications.length} notifications`);

    for (const notification of notifications) {
      try {
        if (notification.read && notification.serverId) {
          // Mark as read on server
          const response = await apiFetch(
            `/api/notifications/${notification.serverId}/read`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to mark notification as read: ${response.status}`);
          }
        }

        await offlineService.markAsSynced('notifications', notification.id);
      } catch (error: any) {
        logger.error(`Failed to sync notification ${notification.id}`, { error });
        await recordAutomationFailure({
          triggerFired: 'Offline notification sync failed',
          actionSelected: 'Sync offline notification state',
          toolCalled: 'offline-sync',
          backendEndpoint: '/api/notifications/:id/read',
          error,
        });
      }
    }

    logger.info('Notifications synced');
  }

  /**
   * Sync audit logs
   */
  async syncAuditLogs(auditLogs, token) {
    if (auditLogs.length === 0) return;

    logger.info(`Syncing ${auditLogs.length} audit logs`);

    // Audit logs are typically server-generated, but we may have local actions to sync

    for (const log of auditLogs) {
      try {
        const response = await apiFetch(
          '/api/audit/sync',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: log.action,
              resourceType: log.resourceType,
              resourceId: log.resourceId,
              timestamp: log.timestamp,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to sync audit log: ${response.status}`);
        }

        await offlineService.markAsSynced('auditLogs', log.id);
      } catch (error: any) {
        logger.error(`Failed to sync audit log ${log.id}`, { error });
        await recordAutomationFailure({
          triggerFired: 'Offline audit log sync failed',
          actionSelected: 'Sync offline audit log',
          toolCalled: 'offline-sync',
          backendEndpoint: '/api/audit/sync',
          error,
        });
      }
    }

    logger.info('Audit logs synced');
  }

  /**
   * Download latest data from server
   */
  async downloadLatestData(token) {
    try {
      logger.info('Downloading latest data from server');

      await offlineService.cacheOfflineCatalogs();

      // Get user profile
      const profileResponse = await apiFetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData) {
          await offlineService.saveUserProfile(
            profileData.id,
            profileData
          );
        }
      }

      // Get latest notifications
      const notificationsResponse = await apiFetch('/api/notifications?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        if (notificationsData.notifications) {
          for (const notification of notificationsData.notifications) {
            // Only save if not already in local DB
            const existing = await db.notifications.get(notification.id);
            if (!existing) {
              await db.notifications.add({
                ...notification,
                synced: true,
              });
            }
          }
        }
      }

      logger.info('Latest data downloaded');
    } catch (error: any) {
      logger.error('Failed to download latest data', { error });
      await recordAutomationFailure({
        triggerFired: 'Offline catalog refresh failed',
        actionSelected: 'Download latest offline data',
        toolCalled: 'offline-sync',
        backendEndpoint: '/api/users/profile',
        error,
      });
    }
  }

  /**
   * Force immediate sync
   */
  async forceSyncNow() {
    return await this.syncAll();
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      isOnline: navigator.onLine,
      autoSyncEnabled: this.syncInterval !== null,
    };
  }

  /**
   * Clear all offline data and resync
   */
  async resetAndResync() {
    try {
      logger.info('Resetting offline data');

      // Clear all offline data
      await db.messages.clear();
      await db.conversations.clear();
      await db.toolResults.clear();
      await db.auditLogs.clear();
      await db.notifications.clear();
      await db.knowledgeCache.clear();

      // Download fresh data
      const token = localStorage.getItem(AUTH_CONFIG.tokenStorageKey);
      if (token) {
        await this.downloadLatestData(token);
      }

      logger.info('Reset and resync completed');
    } catch (error: any) {
      logger.error('Failed to reset and resync', { error });
      throw error;
    }
  }
}

// Export singleton instance
const syncService = new SyncService();
export default syncService;
