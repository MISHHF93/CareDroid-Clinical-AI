/**
 * AppShell chrome visibility — interactive users always get Header + route tab.
 * Only true public-display / wall-audience modes omit interactive chrome.
 */

import { CANONICAL_ROUTES } from './routes.config';

export type AppShellChromePolicyInput = Readonly<{
  pathname: string;
  /** Screen mode is a public waiting / wall audience surface. */
  isPublicDisplay: boolean;
  /** Wall-density staff kiosk (still interactive — chrome stays on). */
  isWallKiosk: boolean;
}>;

export type AppShellChromePolicy = Readonly<{
  /** Full Header + ShellRouteTab */
  showInteractiveAppChrome: boolean;
  /** Left navigation */
  showSidebar: boolean;
  /** Journey / AI / OI / 3-min / workflow bars under chrome */
  showCommandBars: boolean;
  /** Session chrome bar */
  showSessionBar: boolean;
  /** Notification center host */
  showNotificationPanel: boolean;
  /** Floating operational alarms */
  showAlarmWindow: boolean;
  /** Minimal brand-only bar (legacy wall header) — never when interactive chrome is on */
  showWallBrandHeaderOnly: boolean;
  reason: string;
}>;

function normalizePath(pathname: string): string {
  const path = String(pathname || '/')
    .split('?')[0]
    .split('#')[0];
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}

/**
 * Resolve what chrome to render for the current route + screen mode.
 * Interactive staff profiles always keep the app header on non-public modes.
 */
export function resolveAppShellChromePolicy(
  input: AppShellChromePolicyInput,
): AppShellChromePolicy {
  const pathname = normalizePath(input.pathname);
  const isEmergencyBoard =
    pathname === CANONICAL_ROUTES.emergencyWhiteboard || pathname === '/emergency';

  // Public waiting / audience display inside AppShell — board only
  if (input.isPublicDisplay) {
    return Object.freeze({
      showInteractiveAppChrome: false,
      showSidebar: false,
      showCommandBars: false,
      showSessionBar: false,
      showNotificationPanel: false,
      showAlarmWindow: false,
      showWallBrandHeaderOnly: isEmergencyBoard,
      reason: 'public-display-mode',
    });
  }

  // All authenticated interactive profiles (including wall-density staff kiosk)
  return Object.freeze({
    showInteractiveAppChrome: true,
    showSidebar: true,
    showCommandBars: true,
    showSessionBar: true,
    showNotificationPanel: true,
    showAlarmWindow: true,
    showWallBrandHeaderOnly: false,
    reason: input.isWallKiosk ? 'interactive-wall-density' : 'interactive-app',
  });
}

export function shouldShowInteractiveAppChrome(input: AppShellChromePolicyInput): boolean {
  return resolveAppShellChromePolicy(input).showInteractiveAppChrome;
}
