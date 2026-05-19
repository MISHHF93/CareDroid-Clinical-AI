// Offline database using LocalStorage with sync queue
import { apiFetchJson } from '../services/apiClient';
import logger from '../utils/logger';

class OfflineDB {
  constructor() {
    this.dbName = 'caredroid_offline_db';
    this.syncQueue = [];
  }

  // Initialize database
  init() {
    logger.info('[OfflineDB] Initializing');
    this.loadSyncQueue();
  }

  // Save data to localStorage
  save(key, data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(`${this.dbName}_${key}`, serialized);
      logger.info(`[OfflineDB] Saved: ${key}`);
      return true;
    } catch (error) {
      logger.error('[OfflineDB] Save failed', { error });
      return false;
    }
  }

  // Load data from localStorage
  load(key) {
    try {
      const serialized = localStorage.getItem(`${this.dbName}_${key}`);
      if (serialized === null) {
        return null;
      }
      return JSON.parse(serialized);
    } catch (error) {
      logger.error('[OfflineDB] Load failed', { error });
      return null;
    }
  }

  // Delete data from localStorage
  delete(key) {
    try {
      localStorage.removeItem(`${this.dbName}_${key}`);
      logger.info(`[OfflineDB] Deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error('[OfflineDB] Delete failed', { error });
      return false;
    }
  }

  // Clear all data
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.dbName)) {
          localStorage.removeItem(key);
        }
      });
      logger.info('[OfflineDB] Cleared all data');
      return true;
    } catch (error) {
      logger.error('[OfflineDB] Clear failed', { error });
      return false;
    }
  }

  // Queue action for sync when online
  queueForSync(action, data) {
    const syncItem = {
      id: Date.now(),
      action,
      data,
      timestamp: new Date().toISOString(),
    };
    
    this.syncQueue.push(syncItem);
    this.saveSyncQueue();
    logger.info('[OfflineDB] Queued for sync', { action });
  }

  // Save sync queue
  saveSyncQueue() {
    localStorage.setItem(`${this.dbName}_sync_queue`, JSON.stringify(this.syncQueue));
  }

  // Load sync queue
  loadSyncQueue() {
    try {
      const queue = localStorage.getItem(`${this.dbName}_sync_queue`);
      this.syncQueue = queue ? JSON.parse(queue) : [];
      logger.info(`[OfflineDB] Loaded sync queue: ${this.syncQueue.length} items`);
    } catch (error) {
      logger.error('[OfflineDB] Failed to load sync queue', { error });
      this.syncQueue = [];
    }
  }

  // Process sync queue
  async processSyncQueue() {
    if (this.syncQueue.length === 0) {
      logger.info('[OfflineDB] No items to sync');
      return;
    }

    logger.info(`[OfflineDB] Processing ${this.syncQueue.length} sync items`);
    
    const failedItems = [];
    
    for (const item of this.syncQueue) {
      try {
        await this.syncItem(item);
        logger.info(`[OfflineDB] Synced: ${item.action}`);
      } catch (error) {
        logger.error(`[OfflineDB] Sync failed for ${item.action}`, { error });
        failedItems.push(item);
      }
    }

    this.syncQueue = failedItems;
    this.saveSyncQueue();
    
    logger.info('[OfflineDB] Sync complete');
  }

  // Sync individual item
  async syncItem(item) {
    const { response, data } = await apiFetchJson('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    return data;
  }

  // Patient data methods
  savePatient(patientId, patientData) {
    return this.save(`patient_${patientId}`, patientData);
  }

  loadPatient(patientId) {
    return this.load(`patient_${patientId}`);
  }

  // Cache clinical data
  cacheClinicalData(dataType, data) {
    return this.save(`clinical_${dataType}`, {
      data,
      cachedAt: new Date().toISOString(),
    });
  }

  loadClinicalData(dataType) {
    const cached = this.load(`clinical_${dataType}`);
    if (!cached) return null;

    // Check if cache is still valid (24 hours)
    const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
    const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

    if (cacheAge > maxCacheAge) {
      logger.info(`[OfflineDB] Cache expired for ${dataType}`);
      return null;
    }

    return cached.data;
  }

  // Get database size
  getSize() {
    let total = 0;
    for (const key in localStorage) {
      if (key.startsWith(this.dbName)) {
        total += localStorage[key].length;
      }
    }
    return total;
  }
}

export default new OfflineDB();
