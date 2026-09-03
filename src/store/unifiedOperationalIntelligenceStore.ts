import { create } from 'zustand';
import type { OperationalIntelligenceSnapshot } from '../operational-intelligence/operationalIntelligence.types';
import type {
  UnifiedOperationalIntelligenceSnapshot,
  UnifiedOperationalIntelligenceTriggerEvent,
} from '../config/unifiedOperationalIntelligenceModel';

export type UnifiedOperationalIntelligenceSource = 'backend' | 'backend_evaluate' | 'degraded';

type UnifiedOperationalIntelligenceStoreState = Readonly<{
  backendSnapshot: OperationalIntelligenceSnapshot | null;
  unifiedSnapshot: UnifiedOperationalIntelligenceSnapshot | null;
  source: UnifiedOperationalIntelligenceSource;
  lastBackendEventType?: UnifiedOperationalIntelligenceTriggerEvent | string;
  lastRefreshedAt: string | null;
  refreshError: string;
  isRefreshing: boolean;
  setBackendSnapshot: (snapshot: OperationalIntelligenceSnapshot | null) => void;
  setUnifiedSnapshot: (snapshot: UnifiedOperationalIntelligenceSnapshot | null) => void;
  setSource: (source: UnifiedOperationalIntelligenceSource) => void;
  setLastBackendEventType: (eventType?: string) => void;
  setRefreshError: (message: string) => void;
  setIsRefreshing: (value: boolean) => void;
  markRefreshed: () => void;
}>;

export const useUnifiedOperationalIntelligenceStore =
  create<UnifiedOperationalIntelligenceStoreState>()((set) => ({
    backendSnapshot: null,
    unifiedSnapshot: null,
    source: 'degraded',
    lastBackendEventType: undefined,
    lastRefreshedAt: null,
    refreshError: '',
    isRefreshing: false,
    setBackendSnapshot: (snapshot) => set({ backendSnapshot: snapshot }),
    setUnifiedSnapshot: (snapshot) => set({ unifiedSnapshot: snapshot }),
    setSource: (source) => set({ source }),
    setLastBackendEventType: (eventType) => set({ lastBackendEventType: eventType }),
    setRefreshError: (message) => set({ refreshError: message }),
    setIsRefreshing: (value) => set({ isRefreshing: value }),
    markRefreshed: () => set({ lastRefreshedAt: new Date().toISOString() }),
  }));

export function getUnifiedOperationalIntelligenceStoreState() {
  return useUnifiedOperationalIntelligenceStore.getState();
}
