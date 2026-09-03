import type { ComponentType, ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import CareDroidRouteGuard from '../components/auth/CareDroidRouteGuard';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  ADMIN_CONSOLE_CHILD_ROUTES,
  ADMIN_CONSOLE_REDIRECT_ROUTES,
} from '../config/adminConsoleRoutes';

const lazyRoute = lazyWithRetry;
const lazyNamed = (loader: () => Promise<Record<string, unknown>>, exportName: string) =>
  lazyRoute(() =>
    loader().then((module) => ({ default: module[exportName] as ComponentType<unknown> })),
  );

const AdminOperationsShell = lazyRoute(() => import('../components/admin/AdminOperationsShell'));
const AdminOperationsHomePage = lazyRoute(() => import('../pages/admin/AdminOperationsHome'));
const EdStaffWorkflowAdminPage = lazyRoute(() => import('../pages/admin/EdStaffWorkflowAdmin'));
const TeamManagementPage = lazyNamed(
  () => import('../pages/team/TeamManagement'),
  'TeamManagement',
);
const TenantAdministrationCenterPage = lazyNamed(
  () => import('../pages/organization/OrganizationPages'),
  'TenantAdministrationCenter',
);
const SystemHealthPage = lazyRoute(() => import('../pages/SystemHealth'));
const AutomationAuditTrailPage = lazyRoute(() => import('../pages/AutomationAuditTrail'));

const ADMIN_CONSOLE_PAGE_COMPONENTS = Object.freeze({
  adminOperationsHome: AdminOperationsHomePage,
  edStaffWorkflowAdmin: EdStaffWorkflowAdminPage,
  teamManagement: TeamManagementPage,
  tenantAdministrationCenter: TenantAdministrationCenterPage,
  systemHealth: SystemHealthPage,
  automationAuditTrail: AutomationAuditTrailPage,
} as const);

type LazyRouteProps = {
  children: ReactNode;
  label: string;
};

export function renderAdminConsoleRoutes(LazyRoute: ComponentType<LazyRouteProps>) {
  return (
    <>
      <Route
        path={CANONICAL_ROUTES.adminOperations}
        element={
          <CareDroidRouteGuard>
            <LazyRoute label="Loading admin console...">
              <AdminOperationsShell />
            </LazyRoute>
          </CareDroidRouteGuard>
        }
      >
        {ADMIN_CONSOLE_CHILD_ROUTES.map((route) => {
          const Page =
            ADMIN_CONSOLE_PAGE_COMPONENTS[
              route.componentKey as keyof typeof ADMIN_CONSOLE_PAGE_COMPONENTS
            ];
          return (
            <Route
              key={route.index ? 'index' : route.path}
              index={route.index}
              path={route.index ? undefined : route.path}
              element={
                <LazyRoute label={`Loading ${route.label}...`}>
                  <Page />
                </LazyRoute>
              }
            />
          );
        })}
      </Route>

      {ADMIN_CONSOLE_REDIRECT_ROUTES.map((route) => (
        <Route key={route.path} path={route.path} element={<Navigate to={route.to} replace />} />
      ))}
    </>
  );
}
