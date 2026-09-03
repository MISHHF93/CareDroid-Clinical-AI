import { CANONICAL_ROUTES } from './routes.config';

export type AdminConsoleChildRoute = {
  path?: string;
  label: string;
  componentKey: string;
  index?: boolean;
};

export type AdminConsoleRedirectRoute = {
  path: string;
  to: string;
};

/** Nested admin operations console child routes. */
export const ADMIN_CONSOLE_CHILD_ROUTES = Object.freeze<AdminConsoleChildRoute[]>([
  { index: true, label: 'Admin overview', componentKey: 'adminOperationsHome' },
  { path: 'staff-workflows', label: 'ED workflows', componentKey: 'edStaffWorkflowAdmin' },
  { path: 'team', label: 'Team management', componentKey: 'teamManagement' },
  { path: 'tenant', label: 'Tenant admin', componentKey: 'tenantAdministrationCenter' },
  { path: 'system-health', label: 'System health', componentKey: 'systemHealth' },
  { path: 'audit-trail', label: 'Audit trail', componentKey: 'automationAuditTrail' },
]);

export const ADMIN_CONSOLE_REDIRECT_ROUTES = Object.freeze<AdminConsoleRedirectRoute[]>([
  { path: CANONICAL_ROUTES.tenantAdmin, to: `${CANONICAL_ROUTES.adminOperations}/tenant` },
]);

export const ADMIN_CONSOLE_ROUTE_PATHS = Object.freeze([
  CANONICAL_ROUTES.adminOperations,
  ...ADMIN_CONSOLE_CHILD_ROUTES.filter((route) => route.path).map(
    (route) => `${CANONICAL_ROUTES.adminOperations}/${route.path}`,
  ),
]);
