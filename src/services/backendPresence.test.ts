import { afterEach, describe, expect, it, vi } from 'vitest';
import { isBackendAbsent } from './devBackendAuth';

/**
 * The no-backend fallback in AuthPage hangs off this one predicate, and it is
 * the only thing standing between "let a demo visitor into a frontend-only
 * deployment" and "let anyone past a real backend that just said no". So it is
 * worth pinning both directions explicitly.
 *
 * Absent means: nothing is serving an API at this origin. Present means: a
 * server answered as an API -- including answering "no".
 */

const originalFetch = globalThis.fetch;

function respond({ status = 200, contentType = 'application/json' }) {
  return vi.fn(async () => ({
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
  })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('isBackendAbsent', () => {
  it('treats a missing route as absent', async () => {
    globalThis.fetch = respond({ status: 404, contentType: 'text/plain' });
    await expect(isBackendAbsent()).resolves.toBe(true);
  });

  it('treats a method-not-allowed route as absent', async () => {
    globalThis.fetch = respond({ status: 405, contentType: 'text/plain' });
    await expect(isBackendAbsent()).resolves.toBe(true);
  });

  it('treats an HTML 200 as absent, because a SPA rewrite is not an API', async () => {
    // The long-documented "frontend-only deploy serves /api as index.html" case.
    // Judging on the status code alone would call this a live backend.
    globalThis.fetch = respond({ status: 200, contentType: 'text/html; charset=utf-8' });
    await expect(isBackendAbsent()).resolves.toBe(true);
  });

  it('treats a network failure as absent', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    await expect(isBackendAbsent()).resolves.toBe(true);
  });

  it('treats a JSON 401 as PRESENT, so a real refusal is never overridden', async () => {
    globalThis.fetch = respond({ status: 401, contentType: 'application/json' });
    await expect(isBackendAbsent()).resolves.toBe(false);
  });

  it('treats a JSON 403 as PRESENT — the disabled server-side bypass gate', async () => {
    // This is the case the backend gate exists for. It must never fall through
    // to a locally fabricated session.
    globalThis.fetch = respond({ status: 403, contentType: 'application/json' });
    await expect(isBackendAbsent()).resolves.toBe(false);
  });

  it('treats a JSON 200 as present', async () => {
    globalThis.fetch = respond({ status: 200, contentType: 'application/json' });
    await expect(isBackendAbsent()).resolves.toBe(false);
  });
});
