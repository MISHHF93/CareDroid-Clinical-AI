import { create } from 'zustand';
import type { LivingDocumentationSnapshot } from '../config/livingDocumentationModel';
import { buildLivingDocumentationSnapshot } from '../services/livingDocumentationService';

type LivingDocumentationStoreState = Readonly<{
  snapshot: LivingDocumentationSnapshot | null;
  lastRefreshedAt: string | null;
  setSnapshot: (snapshot: LivingDocumentationSnapshot) => void;
  markRefreshed: () => void;
}>;

export const useLivingDocumentationStore = create<LivingDocumentationStoreState>()((set) => ({
  snapshot: null,
  lastRefreshedAt: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  markRefreshed: () => set({ lastRefreshedAt: new Date().toISOString() }),
}));

export function getLivingDocumentationSnapshot(): LivingDocumentationSnapshot {
  const state = useLivingDocumentationStore.getState();
  if (state.snapshot) return state.snapshot;
  const snapshot = buildLivingDocumentationSnapshot();
  state.setSnapshot(snapshot);
  state.markRefreshed();
  return snapshot;
}

export function refreshLivingDocumentationSnapshot(): LivingDocumentationSnapshot {
  const snapshot = buildLivingDocumentationSnapshot();
  const state = useLivingDocumentationStore.getState();
  state.setSnapshot(snapshot);
  state.markRefreshed();
  return snapshot;
}