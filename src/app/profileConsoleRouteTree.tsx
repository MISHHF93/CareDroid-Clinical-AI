import type { ComponentType, ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import {
  PROFILE_CONSOLE_REDIRECT_ROUTES,
  PROFILE_CONSOLE_ROUTES,
} from '../config/profileConsoleRoutes';

const lazyRoute = lazyWithRetry;

const ProfilePage = lazyRoute(() => import('../pages/Profile'));
const ProfileSettingsPage = lazyRoute(() => import('../pages/ProfileSettings'));
const ProfileActivityPage = lazyRoute(() => import('../pages/profile/ProfileActivity'));
const ProfilePreferencesPage = lazyRoute(() => import('../pages/profile/ProfilePreferences'));
const ProfileSecurityPage = lazyRoute(() => import('../pages/profile/ProfileSecurity'));
const ProfileToolPreferencesPage = lazyRoute(() => import('../pages/profile/ProfileToolPreferences'));
const ProfileWorkspacesPage = lazyRoute(() => import('../pages/profile/ProfileWorkspaces'));
const BillingPage = lazyRoute(() => import('../pages/BillingPage'));
const UsagePage = lazyRoute(() => import('../pages/UsagePage'));
const NotificationPreferencesPage = lazyRoute(() => import('../pages/NotificationPreferences'));
const PlatformSettingsPage = lazyRoute(() => import('../pages/Settings'));

const PROFILE_CONSOLE_PAGE_COMPONENTS = Object.freeze({
  profile: ProfilePage,
  profileSettings: ProfileSettingsPage,
  profileActivity: ProfileActivityPage,
  profilePreferences: ProfilePreferencesPage,
  profileSecurity: ProfileSecurityPage,
  profileToolPreferences: ProfileToolPreferencesPage,
  profileWorkspaces: ProfileWorkspacesPage,
  billing: BillingPage,
  usage: UsagePage,
  notificationPreferences: NotificationPreferencesPage,
  platformSettings: PlatformSettingsPage,
} as const);

type LazyRouteProps = {
  children: ReactNode;
  label: string;
};

export function renderProfileConsoleRoutes(LazyRoute: ComponentType<LazyRouteProps>) {
  return (
    <>
      {PROFILE_CONSOLE_ROUTES.map((route) => {
        const Page =
          PROFILE_CONSOLE_PAGE_COMPONENTS[
            route.componentKey as keyof typeof PROFILE_CONSOLE_PAGE_COMPONENTS
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
      })}

      {PROFILE_CONSOLE_REDIRECT_ROUTES.map((route) => (
        <Route key={route.path} path={route.path} element={<Navigate to={route.to} replace />} />
      ))}
    </>
  );
}