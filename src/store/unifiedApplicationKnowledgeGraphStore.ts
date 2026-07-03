import { create } from 'zustand';
import type { UnifiedApplicationKnowledgeGraphSnapshot } from '../config/unifiedApplicationKnowledgeGraphModel';

type UnifiedApplicationKnowledgeGraphStoreState = Readonly<{
  snapshot: UnifiedApplicationKnowledgeGraphSnapshot | null;
  lastRefreshedAt: string | null;
  lastTriggerEvent?: string;
  setSnapshot: (snapshot: UnifiedApplicationKnowledgeGraphSnapshot | null) => void;
  setLastTriggerEvent: (eventType?: string) => void;
  markRefreshed: () => void;
}>;

export const useUnifiedApplicationKnowledgeGraphStore = create<UnifiedApplicationKnowledgeGraphStoreState>()(
  (set) => ({
    snapshot: null,
    lastRefreshedAt: null,
    lastTriggerEvent: undefined,
    setSnapshot: (snapshot) => set({ snapshot }),
    setLastTriggerEvent: (eventType) => set({ lastTriggerEvent: eventType }),
    markRefreshed: () => set({ lastRefreshedAt: new Date().toISOString() }),
  }),
);

export function getUnifiedApplicationKnowledgeGraphStoreState() {
  return useUnifiedApplicationKnowledgeGraphStore.getState();
}