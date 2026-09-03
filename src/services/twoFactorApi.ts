import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

/**
 * Client for the two-factor endpoints on TwoFactorController.
 *
 * The backend side of 2FA has been complete for a while -- speakeasy TOTP with a
 * +/-2 step window, bcrypt-hashed single-use backup codes from a CSPRNG, throttled
 * verify/disable -- and every route is registered in backendHttpRouteInventory.
 * Nothing called it, so the enforcement guard could not be turned on: it tells a
 * user to "enable it in your security settings" and no such screen existed.
 * This is the client that closes that loop.
 */

const jsonHeaders = { 'content-type': 'application/json' };

export type TwoFactorStatus = {
  enabled: boolean;
  backupCodesRemaining: number;
  lastUsedAt: string | null;
};

export type TwoFactorSecret = {
  /** base32 secret, shown so an authenticator can be set up without a camera. */
  secret: string;
  /** data: URL produced by the backend's QRCode.toDataURL(otpauthUrl). */
  qrCode: string;
  otpauthUrl: string;
};

export type TwoFactorResult<T> = { ok: boolean; data: T | null; message: string };

async function guardedJson<T>(path: string, options: any = {}): Promise<TwoFactorResult<T>> {
  if (!isBackendCapabilityEnabled('twoFactor')) {
    return {
      ok: false,
      data: null,
      message: 'Two-factor authentication is not available on this deployment.',
    };
  }
  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message: data?.message || data?.error || getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data: data as T, message: data?.message || '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export function fetchTwoFactorStatus() {
  return guardedJson<TwoFactorStatus>('/api/two-factor/status');
}

export function generateTwoFactorSecret() {
  return guardedJson<TwoFactorSecret>('/api/two-factor/generate');
}

/** Returns the one-time backup codes; the backend never reveals them again. */
export function enableTwoFactor(secret: string, token: string) {
  return guardedJson<{ backupCodes: string[] }>('/api/two-factor/enable', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ secret, token }),
  });
}

export function disableTwoFactor(token: string) {
  return guardedJson<{ success: boolean }>('/api/two-factor/disable', {
    method: 'DELETE',
    headers: jsonHeaders,
    body: JSON.stringify({ token }),
  });
}

export default Object.freeze({
  fetchTwoFactorStatus,
  generateTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
});
