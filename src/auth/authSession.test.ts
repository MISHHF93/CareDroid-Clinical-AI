import { describe, expect, it } from 'vitest';
import {
  buildAuthUrl,
  deriveAuthMode,
  isOpenAccessUser,
  isRealAuthToken,
  resolvePostAuthDestination,
  sanitizeReturnUrl,
} from './authSession';
import { CANONICAL_ROUTES } from '../config/routes.config';

describe('authSession', () => {
  it('sanitizes unsafe return URLs', () => {
    expect(sanitizeReturnUrl('/emergency/reception')).toBe('/emergency/reception');
    expect(sanitizeReturnUrl('//evil.example')).toBe('/');
    expect(sanitizeReturnUrl('/auth?mode=login')).toBe('/');
    expect(sanitizeReturnUrl('')).toBe('/');
  });

  it('routes legacy auth URL builders to platform entry or safe return paths', () => {
    expect(buildAuthUrl()).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(buildAuthUrl({ returnUrl: '/profile' })).toBe('/profile');
  });

  it('resolves post-auth destinations to clinical home or safe return URL', () => {
    expect(
      resolvePostAuthDestination({
        user: { role: 'physician' },
        profile: { saasProfile: { onboardingStatus: 'pending' } },
        returnUrl: '/',
      }),
    ).not.toBe('/welcome');
    expect(
      resolvePostAuthDestination({
        user: { role: 'physician' },
        profile: { saasProfile: { onboardingStatus: 'complete' } },
        returnUrl: '/profile',
      }),
    ).toBe('/profile');
  });

  it('always treats sessions as open-access during the build phase', () => {
    expect(isRealAuthToken('eyJhbGciOiJIUzI1NiJ9.token')).toBe(false);
    expect(isOpenAccessUser({ id: 'open-access-user' })).toBe(true);
    expect(
      deriveAuthMode({ id: 'user-1', authMode: 'authenticated' }, 'real-jwt-token'),
    ).toBe('open-access');
    expect(deriveAuthMode({ id: 'open-access-user' }, 'dev-bypass-token')).toBe('open-access');
  });
});
