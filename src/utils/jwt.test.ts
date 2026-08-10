import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, isJwtExpired } from './jwt';

function makeJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode(header)}.${encode(payload)}.signature`;
}

describe('decodeJwtPayload', () => {
  it('decodes a well-formed JWT payload', () => {
    const token = makeJwt({ sub: 'user-1', exp: 123 });
    expect(decodeJwtPayload(token)).toEqual({ sub: 'user-1', exp: 123 });
  });

  it('returns null for a non-JWT string (e.g. the static dev-bypass token)', () => {
    expect(decodeJwtPayload('dev-bypass-token')).toBeNull();
  });

  it('returns null for empty/undefined input', () => {
    expect(decodeJwtPayload('')).toBeNull();
    expect(decodeJwtPayload(undefined as unknown as string)).toBeNull();
  });
});

describe('isJwtExpired', () => {
  it('is false for a token with a future exp', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = makeJwt({ sub: 'user-1', exp: nowSeconds + 900 });
    expect(isJwtExpired(token)).toBe(false);
  });

  it('is true for a token whose exp has already passed -- the exact real-world case that let a stale 15-minute dev-session token get reused indefinitely', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = makeJwt({ sub: 'user-1', exp: nowSeconds - 100 });
    expect(isJwtExpired(token)).toBe(true);
  });

  it('treats a token within the skew window of expiring as expired', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = makeJwt({ sub: 'user-1', exp: nowSeconds + 10 });
    expect(isJwtExpired(token, 30)).toBe(true);
  });

  it('is false (fail-open) when exp cannot be determined -- never invalidates a token this function cannot understand', () => {
    expect(isJwtExpired('dev-bypass-token')).toBe(false);
    const noExpToken = makeJwt({ sub: 'user-1' });
    expect(isJwtExpired(noExpToken)).toBe(false);
  });
});
