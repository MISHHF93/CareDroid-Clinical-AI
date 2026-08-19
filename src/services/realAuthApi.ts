import { API_ROUTES } from '../config/api.config';
import { AUTH_CONFIG } from '../config/auth.config';

/**
 * HEAL-347.12: the backend has always had a complete, real credential system
 * (register/login/2FA/OAuth -- backend/src/modules/auth/) but nothing in the
 * frontend ever called it; the demo persona switcher (`/start`) was the only
 * functional way into the app. This is the frontend client for that real
 * system, kept deliberately separate from devBackendAuth.ts (which issues a
 * real JWT too, but for an anonymous dev/demo identity, not a genuine
 * credentialed account).
 */

export interface RealAuthUser {
  id: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

export interface RealLoginSuccess {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: RealAuthUser;
}

export interface RealLoginTwoFactorRequired {
  requiresTwoFactor: true;
  userId: string;
  twoFactorChallenge: unknown;
}

export type RealLoginResult = RealLoginSuccess | RealLoginTwoFactorRequired;

export interface RealRegisterResult {
  userId: string;
  email: string;
  verificationRequired: boolean;
}

async function parseJsonSafe(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function messageFromPayload(payload: any, fallback: string): string {
  const message = payload?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && message) return message;
  return fallback;
}

async function postJson<T>(path: string, body: Record<string, unknown>, fallbackErrorMessage: string): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(messageFromPayload(payload, fallbackErrorMessage));
  }
  return payload as T;
}

export function loginWithPassword(email: string, password: string): Promise<RealLoginResult> {
  return postJson<RealLoginResult>(
    API_ROUTES.auth.login,
    { email, password },
    'Invalid email or password.',
  );
}

export function registerAccount(
  email: string,
  password: string,
  fullName: string,
): Promise<RealRegisterResult> {
  return postJson<RealRegisterResult>(
    API_ROUTES.auth.register,
    { email, password, fullName },
    'Could not create an account with those details.',
  );
}

export function verifyTwoFactorLogin(
  userId: string,
  token: string,
  challengeToken: string,
): Promise<RealLoginSuccess> {
  return postJson<RealLoginSuccess>(
    API_ROUTES.auth.verifyTwoFactor,
    { userId, token, challengeToken },
    'Invalid or expired verification code.',
  );
}

/** Writes a real session to the same storage keys apiClient.ts/UserContext.tsx
 * already read -- `authMode: 'real'` is what tells hydrateStoredDemoUser()
 * (demoPersonaModel.ts) to pass this user through instead of discarding it
 * for the anonymous open-access demo identity. */
export function persistRealSession(result: RealLoginSuccess): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(AUTH_CONFIG.tokenStorageKey, result.accessToken);
  localStorage.setItem(
    AUTH_CONFIG.userProfileStorageKey,
    JSON.stringify({ ...result.user, authMode: 'real' }),
  );
  localStorage.removeItem(AUTH_CONFIG.legacyTokenStorageKey);
}

export function isTwoFactorChallenge(result: RealLoginResult): result is RealLoginTwoFactorRequired {
  return (result as RealLoginTwoFactorRequired)?.requiresTwoFactor === true;
}
