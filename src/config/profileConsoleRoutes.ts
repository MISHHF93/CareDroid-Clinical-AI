import { CANONICAL_ROUTES } from './routes.config';

export type ProfileConsoleRoute = {
  path: string;
  label: string;
  componentKey: string;
};

export type ProfileConsoleRedirectRoute = {
  path: string;
  to: string;
};

/** Profile, notification, and SaaS billing surfaces. */
export const PROFILE_CONSOLE_ROUTES = Object.freeze<ProfileConsoleRoute[]>([
  { path: CANONICAL_ROUTES.profile, label: 'Profile', componentKey: 'profile' },
  { path: CANONICAL_ROUTES.profileSettings, label: 'Profile settings', componentKey: 'profileSettings' },
  { path: CANONICAL_ROUTES.profileToolPreferences, label: 'Tool preferences', componentKey: 'profileToolPreferences' },
  { path: '/profile/activity', label: 'Profile activity', componentKey: 'profileActivity' },
  { path: '/profile/preferences', label: 'Profile preferences', componentKey: 'profilePreferences' },
  { path: '/profile/security', label: 'Profile security', componentKey: 'profileSecurity' },
  { path: '/profile/workspaces', label: 'Profile workspaces', componentKey: 'profileWorkspaces' },
  { path: '/notification-preferences', label: 'Notification preferences', componentKey: 'notificationPreferences' },
  { path: CANONICAL_ROUTES.billing, label: 'Billing', componentKey: 'billing' },
  { path: CANONICAL_ROUTES.usage, label: 'Usage', componentKey: 'usage' },
  { path: CANONICAL_ROUTES.settings, label: 'Platform settings', componentKey: 'platformSettings' },
]);

export const PROFILE_CONSOLE_REDIRECT_ROUTES = Object.freeze<ProfileConsoleRedirectRoute[]>([
  { path: '/profile-settings', to: CANONICAL_ROUTES.profileSettings },
  { path: CANONICAL_ROUTES.notifications, to: '/notification-preferences' },
]);

export const PROFILE_CONSOLE_ROUTE_PATHS = Object.freeze(
  PROFILE_CONSOLE_ROUTES.map((route) => route.path),
);