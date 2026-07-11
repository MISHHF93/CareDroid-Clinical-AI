/**
 * Single source of truth for CareDroid account chrome.
 *
 * Placement contract:
 * - Header top-right UserAccountMenu is the ONLY chrome entry for profile/session.
 * - Sidebar must not carry an "Account" utility link to /profile.
 * - Compact profile switcher does NOT sit in the header shelf; demo role switching
 *   lives inside the account menu Session section when allowed.
 *
 * Browser dev surface: http://localhost:5190 (Vite proxies /api → backend).
 */

import { CANONICAL_ROUTES } from '../../config/routes.config';

export const ACCOUNT_CHROME_PLACEMENT = Object.freeze({
  /** Canonical UI entry: header top-right avatar menu */
  entry: 'header-account-menu' as const,
  /** Sidebar account utility is intentionally not used */
  sidebarAccountLink: false,
  /** Compact header <select> for workflow profile — consolidated into the menu */
  headerCompactProfileSwitcher: false,
});

export type AccountMenuDestinationId =
  | 'profile-overview'
  | 'profile-settings'
  | 'entry-hub'
  | 'admin-console';

export type AccountMenuDestination = {
  id: AccountMenuDestinationId;
  label: string;
  path: string;
  /** Primary account action (first in list, stronger weight) */
  primary?: boolean;
  /** Only show for admin SaaS roles */
  adminOnly?: boolean;
};

/** Ordered account destinations shown under the identity block */
export const ACCOUNT_MENU_DESTINATIONS: readonly AccountMenuDestination[] = Object.freeze([
  {
    id: 'profile-overview',
    label: 'Profile overview',
    path: CANONICAL_ROUTES.profile,
    primary: true,
  },
  {
    id: 'profile-settings',
    label: 'Profile settings',
    path: CANONICAL_ROUTES.profileSettings,
  },
  {
    id: 'entry-hub',
    label: 'Entry hub',
    path: CANONICAL_ROUTES.platformStart,
  },
  {
    id: 'admin-console',
    label: 'Admin console',
    path: CANONICAL_ROUTES.adminOperations,
    adminOnly: true,
  },
]);

export function resolveAccountMenuDestinations(options: {
  showAdmin?: boolean;
}): AccountMenuDestination[] {
  const showAdmin = Boolean(options.showAdmin);
  return ACCOUNT_MENU_DESTINATIONS.filter((item) => !item.adminOnly || showAdmin);
}
