const CACHE_MS = 15_000;

let cache: { at: number; reachable: boolean | null } = {
  at: 0,
  reachable: null,
};

export function isLikelyNetworkError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message : String(error || '');
  return /network|fetch|failed to fetch|timeout|aborted|offline|econnrefused|connection refused/i.test(
    message,
  );
}

export function markBackendUnreachable() {
  cache = { at: Date.now(), reachable: false };
}

export function markBackendReachable() {
  cache = { at: Date.now(), reachable: true };
}

export function resetBackendReachabilityCache() {
  cache = { at: 0, reachable: null };
}

export function isBackendReachableCached() {
  return cache.reachable === true;
}

export function isBackendKnownOffline() {
  return cache.reachable === false && Date.now() - cache.at < CACHE_MS;
}

export async function probeBackendReachability(options: any = {}) {
  const force = Boolean(options.force);
  const now = Date.now();
  if (!force && cache.reachable !== null && now - cache.at < CACHE_MS) {
    return cache.reachable;
  }

  if (typeof window === 'undefined') {
    cache = { at: now, reachable: false };
    return false;
  }

  // When no backend URL is configured (pure local/demo mode), skip the health probe.
  // The fetch would fail with ERR_CONNECTION_REFUSED since there's no backend listening.
  // Dynamically import appConfig to avoid circular dependency.
  if (!force) {
    try {
      const { default: appConfig } = await import('../config/appConfig');
      if (!appConfig.api.baseUrl && appConfig.features.allowLocalDemoAuth) {
        cache = { at: now, reachable: false };
        return false;
      }
    } catch {
      // If config import fails, proceed with normal probe
    }
  }

  try {
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs) || 2500;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch('/health', { cache: 'no-store', signal: controller.signal });
    window.clearTimeout(timeoutId);
    cache = { at: now, reachable: response.ok };
  } catch {
    cache = { at: now, reachable: false };
  }

  return cache.reachable;
}
