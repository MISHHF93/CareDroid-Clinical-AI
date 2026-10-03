import { describe, expect, it } from 'vitest';
import { OfflineStoreAndForwardQueue } from './offlineStoreAndForward';
import { RuntimeOptimizationBenchmark } from './runtimeOptimizationBenchmark';

describe('OfflineStoreAndForwardQueue', () => {
  it('enqueues mutations and deduplicates via idempotency key', () => {
    const queue = new OfflineStoreAndForwardQueue();
    queue.setConnectivity('store_and_forward_offline');

    const m1 = queue.enqueue({
      entityType: 'vital_reading',
      entityId: 'v-01',
      action: 'create',
      payloadJson: JSON.stringify({ heartRate: 88, spO2: 97 }),
      idempotencyKey: 'idemp-v-01-key',
    });

    const m2 = queue.enqueue({
      entityType: 'vital_reading',
      entityId: 'v-01',
      action: 'create',
      payloadJson: JSON.stringify({ heartRate: 88, spO2: 97 }),
      idempotencyKey: 'idemp-v-01-key',
    });

    expect(m1.mutationId).toBe(m2.mutationId);
    expect(queue.getPendingCount()).toBe(1);
  });

  it('synchronizes batch and retains unhandled records on network failure', async () => {
    const queue = new OfflineStoreAndForwardQueue();
    queue.setConnectivity('fully_connected');

    queue.enqueue({
      entityType: 'triage_assessment',
      entityId: 'tr-01',
      action: 'create',
      payloadJson: JSON.stringify({ acuity: 'ESI-2' }),
      idempotencyKey: 'key-1',
    });
    queue.enqueue({
      entityType: 'patient',
      entityId: 'pt-02',
      action: 'update',
      payloadJson: JSON.stringify({ phone: '555-0199' }),
      idempotencyKey: 'key-2',
    });

    const result = await queue.synchronize(async (mut) => {
      if (mut.idempotencyKey === 'key-1') {
        return { success: true };
      }
      throw new Error('Server timeout');
    });

    expect(result.syncedCount).toBe(1);
    expect(queue.getPendingCount()).toBe(1);
  });

  it('reconciles conflicts additively for vital signs', async () => {
    const queue = new OfflineStoreAndForwardQueue();
    queue.setConnectivity('fully_connected');

    queue.enqueue({
      entityType: 'vital_reading',
      entityId: 'vital-99',
      action: 'create',
      payloadJson: JSON.stringify({ bp: '130/85' }),
      idempotencyKey: 'key-vital-conflict',
    });

    const result = await queue.synchronize(async () => {
      return {
        success: false,
        conflict: 'Simultaneous reading registered on server',
        serverVersion: 3,
      };
    });

    expect(result.conflictCount).toBe(1);
    expect(queue.getPendingCount()).toBe(0);
  });
});

describe('RuntimeOptimizationBenchmark', () => {
  it('evaluates INT4 and INT8 configurations above 90% quality threshold', () => {
    const bench = new RuntimeOptimizationBenchmark();

    const int8 = bench.evaluateModelConfiguration({
      modelName: 'MedGemma-7B',
      quantization: 'int8',
      kvCacheCompressionEnabled: true,
      batchSize: 1,
      contextLengthTokens: 4096,
    });

    expect(int8.meetsMinimumQualityThreshold).toBe(true);
    expect(int8.clinicalQualityScorePercent).toBeGreaterThanOrEqual(95);
    expect(int8.memoryFootprintMb).toBeLessThan(4000);

    const int4 = bench.evaluateModelConfiguration({
      modelName: 'MedGemma-7B',
      quantization: 'int4',
      kvCacheCompressionEnabled: true,
      batchSize: 1,
      contextLengthTokens: 4096,
    });

    expect(int4.meetsMinimumQualityThreshold).toBe(true);
    expect(int4.clinicalQualityScorePercent).toBeGreaterThanOrEqual(90);
    expect(int4.memoryFootprintMb).toBeLessThan(int8.memoryFootprintMb);
  });

  it('selects hardware-aware runtime based on available VRAM', () => {
    const bench = new RuntimeOptimizationBenchmark();

    const highEnd = bench.selectOptimalRuntimeForHardware({
      cpuCores: 32,
      systemMemoryMb: 65536,
      acceleratorType: 'cuda',
      availableVramMb: 24576,
      batteryPowered: false,
    });
    expect(highEnd.recommendedPrecision).toBe('fp16');

    const tablet = bench.selectOptimalRuntimeForHardware({
      cpuCores: 8,
      systemMemoryMb: 16384,
      acceleratorType: 'apple_metal',
      availableVramMb: 4096,
      batteryPowered: true,
    });
    expect(tablet.recommendedPrecision).toBe('int4');
    expect(tablet.enableKvCacheCompression).toBe(true);
  });
});
