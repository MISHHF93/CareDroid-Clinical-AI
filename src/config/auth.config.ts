import { API_ROUTES } from './api.config';
import { ENV_CONFIG, shouldExposeDemoAuth } from './env.config';
import { AUTH_PATH_ALIASES, AUTH_SIGNUP_PATH_ALIASES, CANONICAL_ROUTES } from './routes.config';

export const AUTH_CONFIG = Object.freeze({
  canonicalRoute: CANONICAL_ROUTES.auth,
  callbackRoute: CANONICAL_ROUTES.authCallback,
  aliases: AUTH_PATH_ALIASES,
  signupAliases: AUTH_SIGNUP_PATH_ALIASES,
  tokenStorageKey: 'caredroid_access_token',
  legacyTokenStorageKey: 'authToken',
  userProfileStorageKey: 'caredroid_user_profile',
  devSessionEndpoint: API_ROUTES.auth.devSession ?? '/api/auth/dev-session',
  demo: Object.freeze({
    get mode() {
      return ENV_CONFIG.demoMode;
    },
    get devBypass() {
      return ENV_CONFIG.enableDevAuthBypass;
    },
    get showDemoAuth() {
      return ENV_CONFIG.showDemoAuth;
    },
    get allowLocalFallback() {
      return ENV_CONFIG.allowLocalDemoAuth;
    },
    get exposed() {
      return shouldExposeDemoAuth();
    },
  }),
});
