import type { ComponentType, ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import {
  PUBLIC_CONSOLE_REDIRECT_ROUTES,
  PUBLIC_CONSOLE_ROUTES,
} from '../config/publicConsoleRoutes';

const lazyRoute = lazyWithRetry;
const lazyNamed = (loader: () => Promise<Record<string, unknown>>, exportName: string) =>
  lazyRoute(() =>
    loader().then((module) => ({ default: module[exportName] as ComponentType<unknown> })),
  );

const VersionPage = lazyRoute(() => import('../pages/Version'));
const HelpCenterPage = lazyRoute(() => import('../pages/HelpCenter'));
const AppNavigatorPage = lazyRoute(() => import('../pages/AppNavigator'));
const GdprNoticePage = lazyRoute(() => import('../pages/GDPRNotice'));
const HipaaNoticePage = lazyRoute(() => import('../pages/HIPAANotice'));
const PrivacyPolicyPage = lazyNamed(() => import('../pages/legal/PrivacyPolicy'), 'PrivacyPolicy');
const TermsOfServicePage = lazyNamed(
  () => import('../pages/legal/TermsOfService'),
  'TermsOfService',
);
const ConsentFlowPage = lazyNamed(() => import('../pages/legal/ConsentFlow'), 'ConsentFlow');
const ConsentHistoryPage = lazyNamed(
  () => import('../pages/legal/ConsentHistory'),
  'ConsentHistory',
);

const PUBLIC_CONSOLE_PAGE_COMPONENTS = Object.freeze({
  version: VersionPage,
  helpCenter: HelpCenterPage,
  appNavigator: AppNavigatorPage,
  gdprNotice: GdprNoticePage,
  hipaaNotice: HipaaNoticePage,
  privacyPolicy: PrivacyPolicyPage,
  termsOfService: TermsOfServicePage,
  consentFlow: ConsentFlowPage,
  consentHistory: ConsentHistoryPage,
} as const);

type LazyRouteProps = {
  children: ReactNode;
  label: string;
};

function renderPublicRoute(
  route: (typeof PUBLIC_CONSOLE_ROUTES)[number],
  LazyRoute: ComponentType<LazyRouteProps>,
) {
  const Page =
    PUBLIC_CONSOLE_PAGE_COMPONENTS[
      route.componentKey as keyof typeof PUBLIC_CONSOLE_PAGE_COMPONENTS
    ];

  return (
    <Route
      key={route.path}
      path={route.path}
      element={
        <LazyRoute label={`Loading ${route.label}...`}>
          <Page />
        </LazyRoute>
      }
    />
  );
}

export function renderPublicConsoleRoutes(
  LazyRoute: ComponentType<LazyRouteProps>,
  options?: { outsideShellOnly?: boolean; insideShellOnly?: boolean },
) {
  const routes = PUBLIC_CONSOLE_ROUTES.filter((route) => {
    if (options?.outsideShellOnly) return route.outsideShell;
    if (options?.insideShellOnly) return !route.outsideShell;
    return true;
  });

  return (
    <>
      {routes.map((route) => renderPublicRoute(route, LazyRoute))}
      {!options?.insideShellOnly &&
        PUBLIC_CONSOLE_REDIRECT_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={<Navigate to={route.to} replace />} />
        ))}
    </>
  );
}
