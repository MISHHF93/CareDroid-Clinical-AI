import Dexie from 'dexie';
import logger from '../utils/logger';

/**
 * IndexedDB Database Schema for CareDroid-AI Offline Storage
 */
class CareDroidDB extends Dexie {
  constructor() {
    super('CareDroidDB');

    // Define database schema
    this.version(1).stores({
      // Chat messages
      messages: '++id, userId, conversationId, timestamp, synced',
      
      // Conversations
      conversations: '++id, userId, lastMessageAt, synced',
      
      // Tool results (SOFA, drug checker, etc.)
      toolResults: '++id, userId, toolType, timestamp, synced',
      
      // User profile data
      userProfile: 'userId, lastSyncedAt',
      
      // Offline actions queue
      syncQueue: '++id, action, timestamp, retryCount, synced',
      
      // Cached medical knowledge (RAG responses)
      knowledgeCache: '++id, query, timestamp, expiresAt',
      
      // Audit logs (local copy)
      auditLogs: '++id, userId, action, timestamp, synced',
      
      // Notification history
      notifications: '++id, userId, timestamp, read, synced',

      // Settings and preferences
      settings: 'key, value, lastUpdated',
    });
  }
}

// Create and export singleton instance
export const db = new CareDroidDB();

/**
 * Initialize database and perform migrations
 */
export const initializeDatabase = async () => {
  try {
    await db.open();
    logger.info('IndexedDB initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize IndexedDB', { error });
    return false;
  }
};

/**
 * Clear all database data (e.g., on logout)
 */
export const clearDatabase = async () => {
  try {
    await db.messages.clear();
    await db.conversations.clear();
    await db.toolResults.clear();
    await db.userProfile.clear();
    await db.syncQueue.clear();
    await db.knowledgeCache.clear();
    await db.auditLogs.clear();
    await db.notifications.clear();
    await db.settings.clear();
    
    logger.info('Database cleared successfully');
  } catch (error) {
    logger.error('Failed to clear database', { error });
    throw error;
  }
};

/**
 * Export database for backup
 */
export const exportDatabase = async () => {
  try {
    const data = {
      messages: await db.messages.toArray(),
      conversations: await db.conversations.toArray(),
      toolResults: await db.toolResults.toArray(),
      userProfile: await db.userProfile.toArray(),
      notifications: await db.notifications.toArray(),
      settings: await db.settings.toArray(),
    };
    
    return JSON.stringify(data, null, 2);
  } catch (error) {
    logger.error('Failed to export database', { error });
    throw error;
  }
};

/**
 * Import database from backup
 */
export const importDatabase = async (jsonData) => {
  try {
    const data = JSON.parse(jsonData);
    
    await clearDatabase();
    
    if (data.messages) await db.messages.bulkAdd(data.messages);
    if (data.conversations) await db.conversations.bulkAdd(data.conversations);
    if (data.toolResults) await db.toolResults.bulkAdd(data.toolResults);
    if (data.userProfile) await db.userProfile.bulkAdd(data.userProfile);
    if (data.notifications) await db.notifications.bulkAdd(data.notifications);
    if (data.settings) await db.settings.bulkAdd(data.settings);
    
    logger.info('Database imported successfully');
  } catch (error) {
    logger.error('Failed to import database', { error });
    throw error;
  }
};

/**
 * Get database size estimate
 */
export const getDatabaseSize = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      usageInMB: (estimate.usage / (1024 * 1024)).toFixed(2),
      quotaInMB: (estimate.quota / (1024 * 1024)).toFixed(2),
      percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2),
    };
  }
  return null;
};

export default db;
