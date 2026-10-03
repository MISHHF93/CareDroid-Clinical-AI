/**
 * CareDroid Edge Intelligence & Runtime Optimization Types
 * Defines node tiers, offline store-and-forward sync queues, hardware execution profiles,
 * and empirical benchmark evaluations for quantization, precision, and KV-cache tradeoffs.
 */

export type EdgeNodeTier =
  | 'cloud_central'
  | 'hospital_on_prem'
  | 'mobile_workstation'
  | 'ambulance_unit'
  | 'rugged_tablet'
  | 'wearable_sensor';

export type ConnectivityStatus =
  | 'fully_connected'
  | 'intermittent_high_latency'
  | 'store_and_forward_offline'
  | 'airgapped_isolated';

export type QuantizationPrecision = 'fp32' | 'fp16' | 'bfloat16' | 'int8' | 'int4';

export interface HardwareProfile {
  cpuCores: number;
  systemMemoryMb: number;
  acceleratorType: 'cuda' | 'rocm' | 'apple_metal' | 'tensorrt' | 'cpu_fallback';
  availableVramMb: number;
  batteryPowered: boolean;
}

export interface QueuedOfflineMutation {
  mutationId: string;
  entityType:
    | 'patient'
    | 'triage_assessment'
    | 'vital_reading'
    | 'clinical_alert'
    | 'medication_admin';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payloadJson: string;
  createdTimestampIso: string;
  retryCount: number;
  idempotencyKey: string;
  clientVersion: number;
}

export interface SyncBatchResult {
  totalProcessed: number;
  syncedCount: number;
  conflictCount: number;
  resolvedMutations: string[];
  conflicts: Array<{ mutationId: string; conflictReason: string; serverVersion: number }>;
}

export interface OptimizationBenchmarkConfig {
  modelName: string;
  quantization: QuantizationPrecision;
  kvCacheCompressionEnabled: boolean;
  batchSize: number;
  contextLengthTokens: number;
}

export interface OptimizationBenchmarkMetrics {
  timeToFirstTokenMs: number;
  tokensPerSecond: number;
  memoryFootprintMb: number;
  clinicalQualityScorePercent: number;
  meetsMinimumQualityThreshold: boolean;
}
