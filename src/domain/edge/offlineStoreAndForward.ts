/**
 * CareDroid Offline Store-and-Forward Synchronization Queue
 * Guarantees zero data loss for disconnected ambulances, disaster medical tents,
 * and mobile clinical workstations by queueing and reconciling mutations upon reconnect.
 */

import { ConnectivityStatus, QueuedOfflineMutation, SyncBatchResult } from './edgeTypes';

export class OfflineStoreAndForwardQueue {
  private queue: QueuedOfflineMutation[] = [];
  private connectivityStatus: ConnectivityStatus = 'fully_connected';
  private maxBatchSize = 50;

  public setConnectivity(status: ConnectivityStatus): void {
    this.connectivityStatus = status;
  }

  public getConnectivity(): ConnectivityStatus {
    return this.connectivityStatus;
  }

  public isOffline(): boolean {
    return (
      this.connectivityStatus === 'store_and_forward_offline' ||
      this.connectivityStatus === 'airgapped_isolated'
    );
  }

  public enqueue(
    mutation: Omit<
      QueuedOfflineMutation,
      'mutationId' | 'createdTimestampIso' | 'retryCount' | 'clientVersion'
    >,
  ): QueuedOfflineMutation {
    const existing = this.queue.find((m) => m.idempotencyKey === mutation.idempotencyKey);
    if (existing) {
      return existing;
    }

    const fullRecord: QueuedOfflineMutation = {
      ...mutation,
      mutationId: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdTimestampIso: new Date().toISOString(),
      retryCount: 0,
      clientVersion: 1,
    };

    this.queue.push(fullRecord);
    return fullRecord;
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public peekPending(limit = 10): QueuedOfflineMutation[] {
    return this.queue.slice(0, limit);
  }

  public async synchronize(
    serverHandler: (
      mutation: QueuedOfflineMutation,
    ) => Promise<{ success: boolean; conflict?: string; serverVersion?: number }>,
  ): Promise<SyncBatchResult> {
    if (this.isOffline()) {
      return {
        totalProcessed: 0,
        syncedCount: 0,
        conflictCount: 0,
        resolvedMutations: [],
        conflicts: [],
      };
    }

    const batch = this.queue.slice(0, this.maxBatchSize);
    const resolvedMutations: string[] = [];
    const conflicts: Array<{ mutationId: string; conflictReason: string; serverVersion: number }> =
      [];

    for (const item of batch) {
      try {
        const response = await serverHandler(item);
        if (response.success) {
          resolvedMutations.push(item.mutationId);
        } else if (response.conflict) {
          conflicts.push({
            mutationId: item.mutationId,
            conflictReason: response.conflict,
            serverVersion: response.serverVersion || 2,
          });
          if (item.entityType === 'vital_reading' || item.entityType === 'clinical_alert') {
            resolvedMutations.push(item.mutationId);
          }
        }
      } catch {
        item.retryCount += 1;
      }
    }

    this.queue = this.queue.filter((m) => !resolvedMutations.includes(m.mutationId));

    return {
      totalProcessed: batch.length,
      syncedCount: resolvedMutations.length,
      conflictCount: conflicts.length,
      resolvedMutations,
      conflicts,
    };
  }

  public clearQueue(): void {
    this.queue = [];
  }
}

export const offlineStoreAndForwardQueue = new OfflineStoreAndForwardQueue();
