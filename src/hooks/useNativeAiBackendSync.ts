import { useEffect } from 'react';
import { ensureDevBackendSession } from '../services/devBackendAuth';
import { fetchNativeAiDriftEnvelope, fetchNativeAiRegistry } from '../services/nativeAiApi';

const LAST_SYNC_KEY = 'caredroid.nativeAi.lastBackendSync.v1';
const SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function shouldSync(force = false): boolean {
  if (typeof window === 'undefined') return false;
  if (force) return true;
  try {
    const last = Number(window.localStorage.getItem(LAST_SYNC_KEY) || 0);
    return Date.now() - last >= SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
}

function markSynced(): void {
  try {
    window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
}

/**
 * Best-effort weekly sync with native AI backend registry and drift envelope.
 * Falls back silently to client-side lib when API is unavailable.
 */
export function useNativeAiBackendSync(enabled = true, options: { force?: boolean } = {}): void {
  useEffect(() => {
    if (!enabled || !shouldSync(options.force)) return;

    let cancelled = false;

    void (async () => {
      try {
        await ensureDevBackendSession();
        await Promise.all([fetchNativeAiRegistry(), fetchNativeAiDriftEnvelope()]);
        if (!cancelled) markSynced();
      } catch {
        // Client-side lib remains authoritative when backend is offline
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, options.force]);
}
