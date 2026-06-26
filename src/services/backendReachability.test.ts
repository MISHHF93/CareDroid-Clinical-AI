import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isBackendKnownOffline,
  isLikelyNetworkError,
  markBackendUnreachable,
  probeBackendReachability,
  resetBackendReachabilityCache,
} from './backendReachability';

describe('backendReachability', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetBackendReachabilityCache();
  });

  it('detects fetch network failures', () => {
    expect(isLikelyNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isLikelyNetworkError(new Error('ECONNREFUSED'))).toBe(true);
  });

  it('caches offline state after probe failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const reachable = await probeBackendReachability({ force: true });
    expect(reachable).toBe(false);
    expect(isBackendKnownOffline()).toBe(true);
  });

  it('marks backend offline without probing', () => {
    markBackendUnreachable();
    expect(isBackendKnownOffline()).toBe(true);
  });
});