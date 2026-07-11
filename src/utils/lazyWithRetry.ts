import { lazy } from 'react';

const CHUNK_RETRY_KEY = 'vite:chunk-load-retry';

function describeExports(moduleValue) {
  if (!moduleValue || typeof moduleValue !== 'object') return 'none';
  const keys = Object.keys(moduleValue);
  return keys.length ? keys.join(', ') : 'none';
}

export function validateLazyModule(moduleValue) {
  const defaultExport = moduleValue?.default;
  const isValidComponent =
    typeof defaultExport === 'function' ||
    (typeof defaultExport === 'object' && defaultExport !== null);

  if (!isValidComponent) {
    const error = new Error(
      `Lazy-loaded route module is missing a valid default export. Exports: ${describeExports(moduleValue)}.`
    );
    error.name = 'InvalidLazyRouteModuleError';
    throw error;
  }

  return moduleValue;
}

/**
 * Same as React.lazy, but if the dynamic import fails (common after a deploy when
 * the browser still has an old index pointing at removed hashed chunks), or resolves
 * to an invalid route module, perform one full reload then rethrow if it still fails.
 */
export function lazyWithRetry(importFn) {
  return lazy(() =>
    Promise.resolve(importFn())
      .then((m) => {
        validateLazyModule(m);
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(CHUNK_RETRY_KEY);
        }
        return m;
      })
      .catch((err) => {
        if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
          throw err;
        }
        // One automatic reload after a failed chunk (stale deploy / missing module).
        // Do NOT return a never-resolving promise — that freezes Suspense as a white screen.
        if (!sessionStorage.getItem(CHUNK_RETRY_KEY)) {
          sessionStorage.setItem(CHUNK_RETRY_KEY, '1');
          window.location.reload();
        }
        sessionStorage.removeItem(CHUNK_RETRY_KEY);
        throw err;
      })
  );
}
