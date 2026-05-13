import { lazy } from 'react';

const CHUNK_RETRY_KEY = 'vite:chunk-load-retry';

/**
 * Same as React.lazy, but if the dynamic import fails (common after a deploy when
 * the browser still has an old index pointing at removed hashed chunks), perform one
 * full reload then rethrow if it still fails.
 */
export function lazyWithRetry(importFn) {
  return lazy(() =>
    Promise.resolve(importFn())
      .then((m) => {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(CHUNK_RETRY_KEY);
        }
        return m;
      })
      .catch((err) => {
        if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
          throw err;
        }
        if (!sessionStorage.getItem(CHUNK_RETRY_KEY)) {
          sessionStorage.setItem(CHUNK_RETRY_KEY, '1');
          window.setTimeout(() => {
            window.location.reload();
          }, 0);
          return new Promise(() => {});
        }
        sessionStorage.removeItem(CHUNK_RETRY_KEY);
        throw err;
      })
  );
}
