import { describe, expect, it } from 'vitest';
import { normalizeApiPath, resolveApiRoot } from './apiEnv';

describe('resolveApiRoot', () => {
  it('uses same-origin /api when VITE_API_URL is unset', () => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      expect(resolveApiRoot()).toBe(`${window.location.origin}/api`);
    } else {
      expect(resolveApiRoot()).toBe('/api');
    }
  });
});

describe('normalizeApiPath', () => {
  it('does not double-prefix /api', () => {
    expect(normalizeApiPath('/api/users/profile')).toBe('/api/users/profile');
  });
});
