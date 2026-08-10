/** Minimal, dependency-free JWT payload decoding — no signature verification (client-side only). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json =
      typeof atob === 'function'
        ? decodeURIComponent(
            atob(padded)
              .split('')
              .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
              .join(''),
          )
        : Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * True when a JWT's `exp` claim has passed (or is within `skewSeconds` of passing).
 * Tokens with no decodable `exp` claim (malformed, or a non-JWT bypass string that
 * slipped past a shape check) are treated as NOT expired -- this function only ever
 * makes a cached token get treated as stale, never makes an otherwise-valid session
 * look invalid when expiry can't be determined.
 */
export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload && typeof payload.exp === 'number' ? payload.exp : null;
  if (exp == null) return false;
  return Date.now() >= (exp - skewSeconds) * 1000;
}
