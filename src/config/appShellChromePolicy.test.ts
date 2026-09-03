import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  resolveAppShellChromePolicy,
  shouldShowInteractiveAppChrome,
} from './appShellChromePolicy';

describe('appShellChromePolicy', () => {
  const interactivePaths = [
    CANONICAL_ROUTES.emergencyWhiteboard,
    CANONICAL_ROUTES.emergencyReception,
    CANONICAL_ROUTES.emergencyEms,
    CANONICAL_ROUTES.emergencyCommandCenter,
    CANONICAL_ROUTES.emergencyTools,
    CANONICAL_ROUTES.emergencySettings,
    '/profile',
    '/profile/preferences',
    '/settings',
    '/fleet/command',
  ];

  it('shows interactive chrome on all clinical and profile paths for staff modes', () => {
    for (const pathname of interactivePaths) {
      const policy = resolveAppShellChromePolicy({
        pathname,
        isPublicDisplay: false,
        isWallKiosk: false,
      });
      expect(policy.showInteractiveAppChrome, pathname).toBe(true);
      expect(policy.showSidebar, pathname).toBe(true);
      expect(policy.showWallBrandHeaderOnly, pathname).toBe(false);
      expect(
        shouldShowInteractiveAppChrome({
          pathname,
          isPublicDisplay: false,
          isWallKiosk: false,
        }),
      ).toBe(true);
    }
  });

  it('keeps interactive chrome for wall-density staff kiosk (not public)', () => {
    const policy = resolveAppShellChromePolicy({
      pathname: CANONICAL_ROUTES.emergencyWhiteboard,
      isPublicDisplay: false,
      isWallKiosk: true,
    });
    expect(policy.showInteractiveAppChrome).toBe(true);
    expect(policy.showSidebar).toBe(true);
    expect(policy.reason).toBe('interactive-wall-density');
  });

  it('hides interactive chrome only for public display audience mode', () => {
    const policy = resolveAppShellChromePolicy({
      pathname: CANONICAL_ROUTES.emergencyWhiteboard,
      isPublicDisplay: true,
      isWallKiosk: true,
    });
    expect(policy.showInteractiveAppChrome).toBe(false);
    expect(policy.showSidebar).toBe(false);
    expect(policy.showCommandBars).toBe(false);
    expect(policy.showWallBrandHeaderOnly).toBe(true);
    expect(policy.reason).toBe('public-display-mode');
  });

  it('does not use public-display rules on non-board routes even if flag mis-set', () => {
    // Public flag should still suppress chrome globally when set
    const policy = resolveAppShellChromePolicy({
      pathname: '/profile',
      isPublicDisplay: true,
      isWallKiosk: false,
    });
    expect(policy.showInteractiveAppChrome).toBe(false);
    expect(policy.showWallBrandHeaderOnly).toBe(false);
  });
});
