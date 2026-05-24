/**
 * URL aliases that must not map to a second login screen — the SPA has a single
 * auth UI at `/auth`. React Router entries redirect these paths to `/auth`.
 *
 * Canonical auth-related routes elsewhere:
 * - `/auth` — sign in / create account (one page)
 * - `/auth-callback` — OAuth token handoff
 * - `/auth/callback` — legacy redirect to `/auth-callback`
 */
export const AUTH_PATH_ALIASES = [
  '/login',
  '/log-in',
  '/signin',
  '/sign-in',
  '/signup',
  '/sign-up',
  '/register',
  '/join',
  '/create-account',
  '/account/login',
  '/account/signup',
  '/account/register',
  '/accounts/login',
  '/accounts/signup',
];

export const AUTH_SIGNUP_PATH_ALIASES = [
  '/signup',
  '/sign-up',
  '/register',
  '/join',
  '/create-account',
  '/account/signup',
  '/account/register',
  '/accounts/signup',
];
