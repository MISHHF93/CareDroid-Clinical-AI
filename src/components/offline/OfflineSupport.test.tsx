import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('OfflineSupport sync request auth header (HEAL-219)', () => {
  const source = readFileSync(join(__dirname, 'OfflineSupport.tsx'), 'utf8');

  it('does not read the dead "authToken" legacy localStorage key directly', () => {
    // 'authToken' (AUTH_CONFIG.legacyTokenStorageKey) is never written
    // anywhere in this codebase -- the real session token lives under
    // 'caredroid_access_token'. Reading it directly always resolved to a
    // literal "Bearer null".
    expect(source).not.toContain("localStorage.getItem('authToken')");
  });

  it('does not manually set an Authorization header on the /api/sync request', () => {
    // apiFetch's own buildRequestHeaders() only auto-attaches the correct,
    // properly-sourced token when the caller hasn't already supplied an
    // Authorization header -- any manually-set header here, correct or
    // not, blocks that auto-attach. Every other apiFetch call in this
    // component correctly omits it and lets apiFetch handle auth.
    const syncBlock = source.slice(
      source.indexOf("await apiFetch('/api/sync'"),
      source.indexOf('body: JSON.stringify({ timestamp:'),
    );
    expect(syncBlock).not.toContain('Authorization');
  });
});
