import type { ComponentType, ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import CareDroidRouteGuard from '../components/auth/CareDroidRouteGuard';
import { GOVERNANCE_WORKSPACE_ROUTES } from '../config/governanceConsoleRoutes';

const PlatformGovernanceWorkspacePage = lazyWithRetry(
  () => import('../pages/platform/PlatformGovernanceWorkspace'),
);

type LazyRouteProps = {
  children: ReactNode;
  label: string;
};

export function renderGovernanceConsoleRoutes(LazyRoute: ComponentType<LazyRouteProps>) {
  return (
    <>
      {GOVERNANCE_WORKSPACE_ROUTES.map((route) => {
        const workspace = (
          <LazyRoute label={`Loading ${route.label}...`}>
            <PlatformGovernanceWorkspacePage />
          </LazyRoute>
        );

        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              route.guarded ? <CareDroidRouteGuard>{workspace}</CareDroidRouteGuard> : workspace
            }
          />
        );
      })}
    </>
  );
}
