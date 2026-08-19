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

  it('routes to the real login/signup page, preserving a safe returnUrl as a query param', () => {
    expect(buildAuthUrl()).toBe(CANONICAL_ROUTES.login);
    expect(buildAuthUrl({ mode: 'signup' })).toBe(CANONICAL_ROUTES.register);
    expect(buildAuthUrl({ returnUrl: '/profile' })).toBe(
      `${CANONICAL_ROUTES.login}?returnUrl=%2Fprofile`,
    );
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

  it('recognizes a genuine 3-segment JWT as a real auth token, and the static bypass token as not', () => {
    expect(isRealAuthToken('header.payload.signature')).toBe(true);
    expect(isRealAuthToken('dev-bypass-token')).toBe(false);
    expect(isRealAuthToken('')).toBe(false);
    expect(isRealAuthToken(null)).toBe(false);
  });

  it('identifies the open-access user by id or authMode, and a real user as not open-access', () => {
    expect(isOpenAccessUser({ id: 'open-access-user' })).toBe(true);
    expect(isOpenAccessUser({ authMode: 'open-access' })).toBe(true);
    expect(isOpenAccessUser(null)).toBe(true);
    expect(isOpenAccessUser({ id: 'user-1', authMode: 'real' })).toBe(false);
  });

  it('reports "real" only when the stored user is marked real AND the token is a genuine JWT', () => {
    expect(
      deriveAuthMode({ id: 'user-1', authMode: 'real' }, 'header.payload.signature'),
    ).toBe('real');
    // real authMode but no usable token yet -- not real until both agree
    expect(deriveAuthMode({ id: 'user-1', authMode: 'real' }, 'dev-bypass-token')).toBe(
      'open-access',
    );
    expect(deriveAuthMode({ id: 'open-access-user' }, 'dev-bypass-token')).toBe('open-access');
    expect(
      deriveAuthMode({ id: 'demo-user', authMode: 'local-dev-demo' }, 'header.payload.signature'),
    ).toBe('local-dev-demo');
    // HEAL-347.16: distinct from 'local-dev-demo' -- only AuthPage.tsx's
    // explicit bypass button ever stamps this marker.
    expect(
      deriveAuthMode({ id: 'demo-user', authMode: 'explicit-dev-bypass' }, 'header.payload.signature'),
    ).toBe('explicit-dev-bypass');
  });
});
