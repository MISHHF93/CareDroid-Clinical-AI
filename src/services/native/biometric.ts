// TypeScript replacement for BiometricAuthManager.kt
// Uses the WebAuthn / FIDO2 platform authenticator API which is available in
// the Chromium-based Capacitor WebView on Android (fingerprint, face unlock).

export type BiometricAvailability =
  | 'available'
  | 'no-hardware'
  | 'hardware-unavailable'
  | 'none-enrolled'
  | 'unsupported'
  | 'unknown';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export interface BiometricPromptOptions {
  title?: string;
  subtitle?: string;
}

function getAvailability(): BiometricAvailability {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return 'unsupported';
  return 'available';
}

async function isAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function authenticate(options: BiometricPromptOptions = {}): Promise<BiometricAuthResult> {
  if (!(await isAvailable())) {
    return { success: false, error: 'Biometric authentication not available on this device' };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60_000,
        userVerification: 'required',
        rpId: window.location.hostname || 'localhost',
      },
    });
    return { success: credential !== null };
  } catch (err: any) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      return { success: false, error: 'Authentication cancelled or failed' };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Authentication failed',
    };
  }
}

export const biometric = { getAvailability, isAvailable, authenticate };
