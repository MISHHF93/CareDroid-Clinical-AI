/**
 * Offline Service - Manages offline data storage and retrieval
 */
import logger from '../utils/logger';
import { db } from '../db/offline.db';
import {
  OFFLINE_CACHE_TTL_MS,
  buildOfflineCatalogSnapshots,
  isOfflineCatalogStale,
  summarizeOfflineCatalogs,
} from '../data/offlineMode';

class OfflineService {
  isInitialized: boolean;
  db: any;

  constructor() {
    this.isInitialized = false;
    this.db = null;
  }

  /**
   * Return the initialized offline database instance.
   */
  async getDb() {
    if (!this.db) {
      this.db = db;
    }
    return this.db;
  }

  /**
   * Initialize offline service
   */
  async initialize() {
    try {
      await db.open();
      this.isInitialized = true;
      logger.info('OfflineService initialized');
      return true;
    } catch (error: any) {
      logger.error('Failed to initialize OfflineService', { error });
      return false;
    }
  }

  /**
   * Check if app is online
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Save message offline
   */
  async saveMessage(message) {
    try {
      const id = await db.messages.add({
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
        synced: false,
      });

      logger.info(`Message saved offline with ID: ${id}`);
      return id;
    } catch (error: any) {
      logger.error('Failed to save message offline', { error });
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId, limit = 50) {
    try {
      const messages = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .reverse()
        .limit(limit)
        .toArray();

      return messages.reverse(); // Return in chronological order
    } catch (error: any) {
      logger.error('Failed to get messages', { error });
      return [];
    }
  }

  /**
   * Save conversation offline
   */
  async saveConversation(conversation) {
    try {
      const id = await db.conversations.add({
        ...conversation,
        lastMessageAt: conversation.lastMessageAt || new Date().toISOString(),
        synced: false,
      });

      logger.info(`Conversation saved offline with ID: ${id}`);
      return id;
    } catch (error: any) {
      logger.error('Failed to save conversation offline', { error });
      throw error;
    }
  }

  /**
   * Get all conversations
   */
  async getConversations(userId) {
    try {
      const conversations = await db.conversations
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('lastMessageAt');

      return conversations;
    } catch (error: any) {
      logger.error('Failed to get conversations', { error });
      return [];
    }
  }

  /**
   * Save tool result offline
   */
  async saveToolResult(toolResult) {
    try {
      const id = await db.toolResults.add({
        ...toolResult,
        timestamp: toolResult.timestamp || new Date().toISOString(),
        synced: false,
      });

      logger.info(`Tool result saved offline with ID: ${id}`);
      return id;
    } catch (error: any) {
      logger.error('Failed to save tool result offline', { error });
      throw error;
    }
  }

  /**
   * Get tool results
   */
  async getToolResults(userId, toolType = null) {
    try {
      let query = db.toolResults.where('userId').equals(userId);

      if (toolType) {
        const results = await query.toArray();
        return results.filter(r => r.toolType === toolType);
      }

      return await query.reverse().toArray();
    } catch (error: any) {
      logger.error('Failed to get tool results', { error });
      return [];
    }
  }

  /**
   * Save user profile offline
   */
  async saveUserProfile(userId, profile) {
    try {
      await db.userProfile.put({
        userId,
        ...profile,
        lastSyncedAt: new Date().toISOString(),
      });

      logger.info('User profile saved offline');
    } catch (error: any) {
      logger.error('Failed to save user profile', { error });
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    try {
      return await db.userProfile.get(userId);
    } catch (error: any) {
      logger.error('Failed to get user profile', { error });
      return null;
    }
  }

  /**
   * Cache knowledge query response
   */
  async cacheKnowledge(query, response, ttlMinutes = 60) {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

      await db.knowledgeCache.add({
        query: query.toLowerCase(),
        response,
        timestamp: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      logger.info('Knowledge cached offline');
    } catch (error: any) {
      logger.error('Failed to cache knowledge', { error });
    }
  }

  /**
   * Get cached knowledge
   */
  async getCachedKnowledge(query) {
    try {
      const results = await db.knowledgeCache
        .where('query')
        .equals(query.toLowerCase())
        .toArray();

      if (results.length === 0) return null;

      // Find most recent non-expired result
      const now = new Date();
      const validResults = results.filter(r => new Date(r.expiresAt) > now);

      if (validResults.length === 0) return null;

      validResults.sort((a, b) => (new Date(b.timestamp) as any) - (new Date(a.timestamp) as any));

      return validResults[0].response;
    } catch (error: any) {
      logger.error('Failed to get cached knowledge', { error });
      return null;
    }
  }

  /**
   * Clean up expired cache
   */
  async cleanupExpiredCache() {
    try {
      const now = new Date().toISOString();
      const expired = await db.knowledgeCache
        .where('expiresAt')
        .below(now)
        .toArray();

      if (expired.length > 0) {
        const expiredIds = expired.map(item => item.id);
        await db.knowledgeCache.bulkDelete(expiredIds);
        logger.info(`Cleaned up ${expired.length} expired cache entries`);
      }
    } catch (error: any) {
      logger.error('Failed to cleanup cache', { error });
    }
  }

  /**
   * Save notification offline
   */
  async saveNotification(notification) {
    try {
      const id = await db.notifications.add({
        ...notification,
        timestamp: notification.timestamp || new Date().toISOString(),
        read: notification.read || false,
        synced: false,
      });

      logger.info(`Notification saved offline with ID: ${id}`);
      return id;
    } catch (error: any) {
      logger.error('Failed to save notification offline', { error });
      throw error;
    }
  }

  /**
   * Get notifications
   */
  async getNotifications(userId, limit = 50) {
    try {
      return await db.notifications
        .where('userId')
        .equals(userId)
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error: any) {
      logger.error('Failed to get notifications', { error });
      return [];
    }
  }

  /**
   * Save setting
   */
  async saveSetting(key, value) {
    try {
      await db.settings.put({
        key,
        value,
        lastUpdated: new Date().toISOString(),
      });

      logger.info(`Setting ${key} saved offline`);
    } catch (error: any) {
      logger.error('Failed to save setting', { error });
      throw error;
    }
  }

  /**
   * Get setting
   */
  async getSetting(key, defaultValue = null) {
    try {
      const setting = await db.settings.get(key);
      return setting ? setting.value : defaultValue;
    } catch (error: any) {
      logger.error('Failed to get setting', { error });
      return defaultValue;
    }
  }

  /**
   * Cache offline-ready platform catalogs for network-free use.
   */
  async cacheOfflineCatalogs({ now = Date.now() }: any = {}) {
    try {
      const snapshots = buildOfflineCatalogSnapshots(now).map((snapshot) => ({
        ...snapshot,
        staleAt: new Date(new Date(snapshot.cachedAt).getTime() + OFFLINE_CACHE_TTL_MS).toISOString(),
        synced: true,
      }));

      await db.offlineCatalogs.bulkPut(snapshots);
      logger.info('Offline catalogs cached', {
        catalogs: snapshots.map((snapshot) => `${snapshot.kind}:${snapshot.count}`).join(', '),
      });
      return summarizeOfflineCatalogs(snapshots, now);
    } catch (error: any) {
      logger.error('Failed to cache offline catalogs', { error });
      return summarizeOfflineCatalogs([], now);
    }
  }

  /**
   * Read one offline catalog snapshot by kind.
   */
  async getOfflineCatalog(kind) {
    try {
      const catalog = await db.offlineCatalogs.get(kind);
      if (!catalog) return null;
      return {
        ...catalog,
        stale: isOfflineCatalogStale(catalog.cachedAt),
      };
    } catch (error: any) {
      logger.error(`Failed to read offline catalog ${kind}`, { error });
      return null;
    }
  }

  /**
   * Read all cached offline catalogs with freshness metadata.
   */
  async getOfflineCatalogs() {
    try {
      const catalogs = await db.offlineCatalogs.toArray();
      return catalogs.map((catalog) => ({
        ...catalog,
        stale: isOfflineCatalogStale(catalog.cachedAt),
      }));
    } catch (error: any) {
      logger.error('Failed to read offline catalogs', { error });
      return [];
    }
  }

  async getOfflineCatalogSummary({ now = Date.now() }: any = {}) {
    const catalogs = await this.getOfflineCatalogs();
    return summarizeOfflineCatalogs(catalogs, now);
  }

  /**
   * Get all unsynced items
   */
  async getUnsyncedItems() {
    try {
      const messages = await db.messages.where('synced').equals(false as any).toArray();
      const conversations = await db.conversations.where('synced').equals(false as any).toArray();
      const toolResults = await db.toolResults.where('synced').equals(false as any).toArray();
      const auditLogs = await db.auditLogs.where('synced').equals(false as any).toArray();
      const notifications = await db.notifications.where('synced').equals(false as any).toArray();

      return {
        messages,
        conversations,
        toolResults,
        auditLogs,
        notifications,
        total: messages.length + conversations.length + toolResults.length + 
               auditLogs.length + notifications.length,
      };
    } catch (error: any) {
      logger.error('Failed to get unsynced items', { error });
      return {
        messages: [],
        conversations: [],
        toolResults: [],
        auditLogs: [],
        notifications: [],
        total: 0,
      };
    }
  }

  /**
   * Mark item as synced
   */
  async markAsSynced(table, id) {
    try {
      await db[table].update(id, { synced: true });
      logger.info(`Marked ${table}/${id} as synced`);
    } catch (error: any) {
      logger.error(`Failed to mark ${table}/${id} as synced`, { error });
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    try {
      const messageCount = await db.messages.count();
      const conversationCount = await db.conversations.count();
      const toolResultCount = await db.toolResults.count();
      const cacheCount = await db.knowledgeCache.count();
      const notificationCount = await db.notifications.count();
      const auditLogCount = await db.auditLogs.count();
      const offlineCatalogCount = await db.offlineCatalogs.count();

      return {
        messages: messageCount,
        conversations: conversationCount,
        toolResults: toolResultCount,
        cachedQueries: cacheCount,
        notifications: notificationCount,
        auditLogs: auditLogCount,
        offlineCatalogs: offlineCatalogCount,
        total: messageCount + conversationCount + toolResultCount + 
               cacheCount + notificationCount + auditLogCount + offlineCatalogCount,
      };
    } catch (error: any) {
      logger.error('Failed to get storage stats', { error });
      return null;
    }
  }
}

// Export singleton instance
const offlineService = new OfflineService();
export default offlineService;
