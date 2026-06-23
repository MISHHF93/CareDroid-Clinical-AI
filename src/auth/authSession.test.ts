import { describe, expect, it } from 'vitest';
import appConfig from '../config/appConfig';
import {
  buildAuthUrl,
  deriveAuthMode,
  isOpenAccessUser,
  isRealAuthToken,
  resolvePostAuthDestination,
  sanitizeReturnUrl,
} from './authSession';

describe('authSession', () => {
  it('sanitizes unsafe return URLs', () => {
    expect(sanitizeReturnUrl('/emergency/reception')).toBe('/emergency/reception');
    expect(sanitizeReturnUrl('//evil.example')).toBe('/');
    expect(sanitizeReturnUrl('/auth?mode=login')).toBe('/');
    expect(sanitizeReturnUrl('')).toBe('/');
  });

  it('builds auth URLs with mode, returnUrl, and invite token', () => {
    expect(buildAuthUrl()).toBe('/auth');
    expect(buildAuthUrl({ mode: 'signup' })).toBe('/auth?mode=signup');
    expect(buildAuthUrl({ returnUrl: '/profile' })).toBe('/auth?returnUrl=%2Fprofile');
    expect(buildAuthUrl({ inviteToken: 'abc-123' })).toBe('/auth?invite=abc-123');
  });

  it('routes incomplete onboarding to welcome', () => {
    expect(
      resolvePostAuthDestination({
        user: { role: 'physician' },
        profile: { saasProfile: { onboardingStatus: 'pending' } },
        returnUrl: '/',
      }),
    ).toBe('/welcome');
  });

  it('uses safe return URL when onboarding is complete', () => {
    expect(
      resolvePostAuthDestination({
        user: { role: 'physician' },
        profile: { saasProfile: { onboardingStatus: 'complete' } },
        returnUrl: '/profile',
      }),
    ).toBe('/profile');
  });

  it('derives auth mode for open access vs authenticated sessions', () => {
    const bypassToken = appConfig.dev?.bearerToken || 'dev-bypass-token';
    expect(isRealAuthToken(bypassToken)).toBe(false);
    expect(isRealAuthToken('eyJhbGciOiJIUzI1NiJ9.token')).toBe(true);
    expect(isOpenAccessUser({ id: 'open-access-user' })).toBe(true);
    expect(
      deriveAuthMode({ id: 'user-1', authMode: 'authenticated' }, 'real-jwt-token'),
    ).toBe('authenticated');
    expect(deriveAuthMode({ id: 'open-access-user' }, bypassToken)).toBe('open-access');
  });
});
