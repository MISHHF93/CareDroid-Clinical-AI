import { CANONICAL_ROUTES } from './routes.config';

export type PublicConsoleRoute = {
  path: string;
  label: string;
  componentKey: string;
  /** When true, route renders outside AppShell (public legal / build info). */
  outsideShell?: boolean;
};

export type PublicConsoleRedirectRoute = {
  path: string;
  to: string;
};

/**
 * Public legal notices, onboarding consent, and build metadata.
 * Operational privacy/consent workspaces remain under governanceConsoleRoutes.
 */
export const PUBLIC_CONSOLE_ROUTES = Object.freeze<PublicConsoleRoute[]>([
  {
    path: CANONICAL_ROUTES.version,
    label: 'Build version',
    componentKey: 'version',
    outsideShell: true,
  },
  {
    path: CANONICAL_ROUTES.helpCenter,
    label: 'Help center',
    componentKey: 'helpCenter',
    outsideShell: true,
  },
  { path: CANONICAL_ROUTES.appNavigator, label: 'App navigator', componentKey: 'appNavigator' },
  {
    path: CANONICAL_ROUTES.legalPrivacyPolicy,
    label: 'Privacy policy',
    componentKey: 'privacyPolicy',
    outsideShell: true,
  },
  {
    path: CANONICAL_ROUTES.legalTerms,
    label: 'Terms of service',
    componentKey: 'termsOfService',
    outsideShell: true,
  },
  {
    path: CANONICAL_ROUTES.legalGdpr,
    label: 'GDPR notice',
    componentKey: 'gdprNotice',
    outsideShell: true,
  },
  {
    path: CANONICAL_ROUTES.legalHipaa,
    label: 'HIPAA notice',
    componentKey: 'hipaaNotice',
    outsideShell: true,
  },
  {
    path: CANONICAL_ROUTES.onboardingConsent,
    label: 'Consent onboarding',
    componentKey: 'consentFlow',
  },
  {
    path: CANONICAL_ROUTES.consentHistory,
    label: 'Consent history',
    componentKey: 'consentHistory',
  },
]);

/** Short public aliases documented in segmentInventory and .env examples. */
export const PUBLIC_CONSOLE_REDIRECT_ROUTES = Object.freeze<PublicConsoleRedirectRoute[]>([
  { path: '/gdpr', to: CANONICAL_ROUTES.legalGdpr },
  { path: '/hipaa', to: CANONICAL_ROUTES.legalHipaa },
  { path: '/terms', to: CANONICAL_ROUTES.legalTerms },
  { path: '/privacy-policy', to: CANONICAL_ROUTES.legalPrivacyPolicy },
]);

export const PUBLIC_CONSOLE_ROUTE_PATHS = Object.freeze(
  PUBLIC_CONSOLE_ROUTES.map((route) => route.path),
);
