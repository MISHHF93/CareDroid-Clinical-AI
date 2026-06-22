/**
 * TrackMind role workspace composition — KPIs, quick actions, and module focus per persona.
 */
import { CANONICAL_ROUTES } from './routes.config';
import { TRACKMIND_PERMISSION_KEYS } from './trackMindPermissionRegistry';
import {
  TRACKMIND_ROLE_ID,
  TRACKMIND_ROLE_DOMAIN,
  normalizeTrackMindRoleId,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';

const K = TRACKMIND_PERMISSION_KEYS;
const R = TRACKMIND_ROLE_ID;

export type TrackMindQuickAction = Readonly<{
  id: string;
  label: string;
  permission: string;
  route?: string;
}>;

export type TrackMindWorkspaceDefinition = Readonly<{
  roleId: TrackMindRoleId;
  title: string;
  subtitle: string;
  focusDomain: string;
  kpiPermissionKeys: readonly string[];
  quickActions: readonly TrackMindQuickAction[];
  relatedRoutes: readonly string[];
}>;

const WORKSPACE_BASE: Omit<TrackMindWorkspaceDefinition, 'roleId'> = Object.freeze({
  title: 'TrackMind Workspace',
  subtitle: 'Role-resonant operating surface',
  focusDomain: TRACKMIND_ROLE_DOMAIN.limited,
  kpiPermissionKeys: Object.freeze([K.kpiRaceDayView]),
  quickActions: Object.freeze([]),
  relatedRoutes: Object.freeze([CANONICAL_ROUTES.trackMindWorkspace]),
});

export const TRACKMIND_WORKSPACE_DEFINITIONS: Record<TrackMindRoleId, TrackMindWorkspaceDefinition> =
  Object.freeze({
    [R.platformSuperAdmin]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.platformSuperAdmin,
      title: 'Platform Command',
      subtitle: 'Global tenants, module entitlements, and platform observability',
      focusDomain: TRACKMIND_ROLE_DOMAIN.platformAdmin,
      kpiPermissionKeys: [K.kpiExecutiveView, K.kpiComplianceView, K.kpiFinanceView],
      quickActions: [
        { id: 'tenants', label: 'Manage tenants', permission: K.platformTenantManage, route: CANONICAL_ROUTES.platformAdmin },
        { id: 'modules', label: 'Module entitlements', permission: K.moduleEntitlementManage, route: CANONICAL_ROUTES.featureFlags },
        { id: 'observability', label: 'Platform observability', permission: K.intelligenceView, route: `${CANONICAL_ROUTES.platformIntelligence}#observability` },
      ],
      relatedRoutes: [CANONICAL_ROUTES.platformAdmin, CANONICAL_ROUTES.platformIntelligence, CANONICAL_ROUTES.saasHealth],
    }),
    [R.organizationAdmin]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.organizationAdmin,
      title: 'Organization Governance',
      subtitle: 'Racetrack portfolio, users, and executive governance',
      focusDomain: TRACKMIND_ROLE_DOMAIN.governance,
      kpiPermissionKeys: [K.kpiExecutiveView, K.kpiComplianceView, K.kpiFinanceView],
      quickActions: [
        { id: 'users', label: 'Manage users', permission: K.orgUserManage, route: CANONICAL_ROUTES.tenantAdmin },
        { id: 'enterprise', label: 'Enterprise platform', permission: K.enterpriseView, route: CANONICAL_ROUTES.enterprisePlatform },
        { id: 'maturity', label: 'Maturity assessment', permission: K.maturityView, route: CANONICAL_ROUTES.trackMindMaturity },
      ],
      relatedRoutes: [CANONICAL_ROUTES.enterprisePlatform, CANONICAL_ROUTES.tenantAdmin, CANONICAL_ROUTES.trackMindMaturity],
    }),
    [R.racetrackAdmin]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.racetrackAdmin,
      title: 'Racetrack Administration',
      subtitle: 'Local users, configuration, and operational reporting',
      focusDomain: TRACKMIND_ROLE_DOMAIN.governance,
      kpiPermissionKeys: [K.kpiRaceDayView, K.kpiComplianceView, K.kpiFacilitiesView],
      quickActions: [
        { id: 'config', label: 'Track configuration', permission: K.racetrackConfigManage, route: CANONICAL_ROUTES.tenantAdmin },
        { id: 'audit', label: 'Audit export', permission: K.auditExport, route: CANONICAL_ROUTES.audit },
        { id: 'maturity', label: 'Maturity dashboard', permission: K.maturityView, route: CANONICAL_ROUTES.trackMindMaturity },
      ],
      relatedRoutes: [CANONICAL_ROUTES.trackMindMaturity, CANONICAL_ROUTES.tenantAdmin, CANONICAL_ROUTES.audit],
    }),
    [R.raceDayOperationsManager]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.raceDayOperationsManager,
      title: 'Race-Day Command Center',
      subtitle: 'Readiness, incidents, approvals, and live operational timeline',
      focusDomain: TRACKMIND_ROLE_DOMAIN.raceDayOps,
      kpiPermissionKeys: [K.kpiRaceDayView, K.kpiFacilitiesView, K.kpiSecurityView],
      quickActions: [
        { id: 'status', label: 'Update race-day status', permission: K.racedayStatusUpdate },
        { id: 'incident', label: 'Open incident command', permission: K.racedayIncidentCommand },
        { id: 'approvals', label: 'Approvals queue', permission: K.approvalReview, route: CANONICAL_ROUTES.workflows },
      ],
      relatedRoutes: [CANONICAL_ROUTES.platformIntelligence, CANONICAL_ROUTES.workflows],
    }),
    [R.steward]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.steward,
      title: 'Steward Command Center',
      subtitle: 'Inquiries, incidents, evidence review, and governed decisions',
      focusDomain: TRACKMIND_ROLE_DOMAIN.stewarding,
      kpiPermissionKeys: [K.kpiRaceDayView],
      quickActions: [
        { id: 'review', label: 'Review incidents', permission: K.stewardIncidentReview },
        { id: 'decision', label: 'Steward decision', permission: K.stewardDecisionCreate },
        { id: 'audit', label: 'Steward audit trail', permission: K.auditView, route: CANONICAL_ROUTES.audit },
      ],
      relatedRoutes: [CANONICAL_ROUTES.audit, CANONICAL_ROUTES.workflows],
    }),
    [R.starterRaceOfficial]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.starterRaceOfficial,
      title: 'Starter Operations',
      subtitle: 'Gate readiness, race flow, and official status updates',
      focusDomain: TRACKMIND_ROLE_DOMAIN.racingControl,
      kpiPermissionKeys: [K.kpiRaceDayView],
      quickActions: [
        { id: 'readiness', label: 'Update gate readiness', permission: K.starterReadinessUpdate },
        { id: 'approval', label: 'Request approval', permission: K.approvalRequest, route: CANONICAL_ROUTES.workflows },
      ],
      relatedRoutes: [CANONICAL_ROUTES.platformIntelligence],
    }),
    [R.paddockOfficial]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.paddockOfficial,
      title: 'Paddock Operations',
      subtitle: 'Arrivals, inspections, readiness checks, and paddock incidents',
      focusDomain: TRACKMIND_ROLE_DOMAIN.paddock,
      kpiPermissionKeys: [K.kpiRaceDayView],
      quickActions: [
        { id: 'observe', label: 'Log observation', permission: K.paddockObservationCreate },
        { id: 'readiness', label: 'Update readiness', permission: K.paddockReadinessUpdate },
      ],
      relatedRoutes: [CANONICAL_ROUTES.trackMindMaturity],
    }),
    [R.equineWelfareOfficer]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.equineWelfareOfficer,
      title: 'Equine Welfare Operations',
      subtitle: 'Welfare observations, restrictions, and welfare incidents',
      focusDomain: TRACKMIND_ROLE_DOMAIN.equineWelfare,
      kpiPermissionKeys: [K.kpiWelfareView, K.kpiRaceDayView],
      quickActions: [
        { id: 'observe', label: 'Welfare observation', permission: K.welfareObservationCreate },
        { id: 'restrictions', label: 'Review restrictions', permission: K.welfareRestrictionReview },
        { id: 'maturity', label: 'Welfare maturity', permission: K.maturityView, route: CANONICAL_ROUTES.trackMindMaturity },
      ],
      relatedRoutes: [CANONICAL_ROUTES.trackMindMaturity],
    }),
    [R.veterinarian]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.veterinarian,
      title: 'Veterinary Workspace',
      subtitle: 'Examinations, clearance metadata, and privacy-scoped medical records',
      focusDomain: TRACKMIND_ROLE_DOMAIN.veterinary,
      kpiPermissionKeys: [K.kpiWelfareView],
      quickActions: [
        { id: 'record', label: 'Veterinary record', permission: K.veterinaryRecordWrite },
        { id: 'review', label: 'Review clearance', permission: K.veterinaryRecordView },
        { id: 'audit', label: 'Medical audit trail', permission: K.auditView, route: CANONICAL_ROUTES.audit },
      ],
      relatedRoutes: [CANONICAL_ROUTES.audit],
    }),
    [R.trainerLiaison]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.trainerLiaison,
      title: 'Horse Operations',
      subtitle: 'Trainer assignments, entries, logistics, and transport records',
      focusDomain: TRACKMIND_ROLE_DOMAIN.horseOps,
      kpiPermissionKeys: [K.kpiRaceDayView],
      quickActions: [
        { id: 'horse', label: 'Horse operations', permission: K.horseOpsManage },
        { id: 'approval', label: 'Request approval', permission: K.approvalRequest, route: CANONICAL_ROUTES.workflows },
      ],
      relatedRoutes: [CANONICAL_ROUTES.enterprisePlatform],
    }),
    [R.securityManager]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.securityManager,
      title: 'Security Operations',
      subtitle: 'Restricted zones, access events, and security incidents',
      focusDomain: TRACKMIND_ROLE_DOMAIN.security,
      kpiPermissionKeys: [K.kpiSecurityView],
      quickActions: [
        { id: 'incident', label: 'Security incident', permission: K.securityIncidentManage },
        { id: 'export', label: 'Security audit export', permission: K.securityAuditExport, route: CANONICAL_ROUTES.audit },
        { id: 'alerts', label: 'Alert center', permission: K.intelligenceView, route: CANONICAL_ROUTES.security },
      ],
      relatedRoutes: [CANONICAL_ROUTES.security, CANONICAL_ROUTES.audit],
    }),
    [R.facilitiesManager]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.facilitiesManager,
      title: 'Facilities Readiness',
      subtitle: 'Inspections, maintenance, work orders, and surface status',
      focusDomain: TRACKMIND_ROLE_DOMAIN.facilities,
      kpiPermissionKeys: [K.kpiFacilitiesView, K.kpiRaceDayView],
      quickActions: [
        { id: 'inspect', label: 'Create inspection', permission: K.facilitiesInspectionCreate },
        { id: 'maintain', label: 'Maintenance task', permission: K.facilitiesMaintenanceManage },
        { id: 'maturity', label: 'Facilities maturity', permission: K.maturityView, route: CANONICAL_ROUTES.trackMindMaturity },
      ],
      relatedRoutes: [CANONICAL_ROUTES.trackMindMaturity],
    }),
    [R.complianceOfficer]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.complianceOfficer,
      title: 'Compliance Command Center',
      subtitle: 'Policy registry, evidence, controls, and audit exports',
      focusDomain: TRACKMIND_ROLE_DOMAIN.compliance,
      kpiPermissionKeys: [K.kpiComplianceView],
      quickActions: [
        { id: 'evidence', label: 'Attach evidence', permission: K.complianceEvidenceAttach, route: CANONICAL_ROUTES.governanceRegistry },
        { id: 'export', label: 'Compliance export', permission: K.complianceReportExport, route: CANONICAL_ROUTES.regulatory },
        { id: 'audit', label: 'Audit trails', permission: K.auditView, route: CANONICAL_ROUTES.audit },
      ],
      relatedRoutes: [CANONICAL_ROUTES.governanceRegistry, CANONICAL_ROUTES.regulatory, CANONICAL_ROUTES.audit],
    }),
    [R.financeManager]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.financeManager,
      title: 'Finance Operations',
      subtitle: 'Revenue, cost dashboards, payout governance, and financial audit',
      focusDomain: TRACKMIND_ROLE_DOMAIN.finance,
      kpiPermissionKeys: [K.kpiFinanceView],
      quickActions: [
        { id: 'reports', label: 'Finance reports', permission: K.financeReportView, route: CANONICAL_ROUTES.billing },
        { id: 'records', label: 'Finance records', permission: K.financeRecordManage, route: CANONICAL_ROUTES.billing },
        { id: 'approvals', label: 'Financial approvals', permission: K.approvalReview, route: CANONICAL_ROUTES.workflows },
      ],
      relatedRoutes: [CANONICAL_ROUTES.billing, CANONICAL_ROUTES.usage],
    }),
    [R.ticketingFanExperienceManager]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.ticketingFanExperienceManager,
      title: 'Fan Experience',
      subtitle: 'Ticketing, attendance, hospitality, and guest services',
      focusDomain: TRACKMIND_ROLE_DOMAIN.fanExperience,
      kpiPermissionKeys: [K.kpiFanView],
      quickActions: [
        { id: 'ticketing', label: 'Ticketing workflows', permission: K.fanExperienceManage },
        { id: 'analytics', label: 'Fan analytics', permission: K.analyticsView, route: CANONICAL_ROUTES.platformIntelligence },
      ],
      relatedRoutes: [CANONICAL_ROUTES.customerPortal, CANONICAL_ROUTES.platformIntelligence],
    }),
    [R.executiveLeadership]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.executiveLeadership,
      title: 'Executive Dashboard',
      subtitle: 'Operational KPIs, compliance posture, and incident summaries',
      focusDomain: TRACKMIND_ROLE_DOMAIN.executive,
      kpiPermissionKeys: [K.kpiExecutiveView, K.kpiComplianceView, K.kpiFinanceView, K.kpiRaceDayView],
      quickActions: [
        { id: 'executive', label: 'Executive cockpit', permission: K.executiveDashboardView, route: CANONICAL_ROUTES.executive },
        { id: 'intelligence', label: 'Platform intelligence', permission: K.intelligenceView, route: `${CANONICAL_ROUTES.platformIntelligence}#executive` },
        { id: 'approvals', label: 'Pending approvals', permission: K.approvalReview, route: CANONICAL_ROUTES.workflows },
      ],
      relatedRoutes: [CANONICAL_ROUTES.executive, CANONICAL_ROUTES.platformIntelligence],
    }),
    [R.auditorRegulator]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.auditorRegulator,
      title: 'Audit & Evidence Review',
      subtitle: 'Immutable history, evidence packets, and approvals history',
      focusDomain: TRACKMIND_ROLE_DOMAIN.audit,
      kpiPermissionKeys: [K.kpiComplianceView],
      quickActions: [
        { id: 'audit', label: 'Audit trails', permission: K.auditView, route: CANONICAL_ROUTES.audit },
        { id: 'export', label: 'Export evidence', permission: K.auditExport, route: CANONICAL_ROUTES.regulatory },
        { id: 'governance', label: 'Governance registry', permission: K.governanceRegistryView, route: CANONICAL_ROUTES.governanceRegistry },
      ],
      relatedRoutes: [CANONICAL_ROUTES.audit, CANONICAL_ROUTES.governanceRegistry, CANONICAL_ROUTES.regulatory],
    }),
    [R.dataAnalyticsUser]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.dataAnalyticsUser,
      title: 'Analytics Workspace',
      subtitle: 'KPI dashboards, trends, data quality, and benchmarking',
      focusDomain: TRACKMIND_ROLE_DOMAIN.analytics,
      kpiPermissionKeys: [K.kpiExecutiveView, K.kpiRaceDayView, K.kpiWelfareView, K.kpiFacilitiesView, K.kpiSecurityView, K.kpiComplianceView, K.kpiFinanceView, K.kpiFanView],
      quickActions: [
        { id: 'kpi', label: 'KPI intelligence', permission: K.analyticsView, route: `${CANONICAL_ROUTES.platformIntelligence}#kpi-intelligence` },
        { id: 'export', label: 'Export report', permission: K.analyticsExport, route: CANONICAL_ROUTES.regulatory },
        { id: 'maturity', label: 'Maturity trends', permission: K.maturityView, route: CANONICAL_ROUTES.trackMindMaturity },
      ],
      relatedRoutes: [CANONICAL_ROUTES.platformIntelligence, CANONICAL_ROUTES.trackMindMaturity],
    }),
    [R.supportInternalOperator]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.supportInternalOperator,
      title: 'Support Operations',
      subtitle: 'Tenant troubleshooting, diagnostics, and governed support access',
      focusDomain: TRACKMIND_ROLE_DOMAIN.support,
      kpiPermissionKeys: [],
      quickActions: [
        { id: 'diagnostics', label: 'Diagnostics', permission: K.supportDiagnosticsView, route: CANONICAL_ROUTES.selfDiagnostics },
        { id: 'tenant', label: 'Tenant admin', permission: K.tenantAdminView, route: CANONICAL_ROUTES.tenantAdmin },
        { id: 'platform', label: 'Platform admin', permission: K.platformAdminView, route: CANONICAL_ROUTES.platformAdmin },
      ],
      relatedRoutes: [CANONICAL_ROUTES.platformAdmin, CANONICAL_ROUTES.selfDiagnostics, CANONICAL_ROUTES.saasHealth],
    }),
    [R.genericStaff]: Object.freeze({
      ...WORKSPACE_BASE,
      roleId: R.genericStaff,
      title: 'Assigned Tasks',
      subtitle: 'Limited operational tasks and assigned forms',
      focusDomain: TRACKMIND_ROLE_DOMAIN.limited,
      kpiPermissionKeys: [],
      quickActions: [
        { id: 'tasks', label: 'My workflows', permission: K.workspaceView, route: CANONICAL_ROUTES.workflows },
      ],
      relatedRoutes: [CANONICAL_ROUTES.workflows],
    }),
  });

export function getTrackMindWorkspaceDefinition(role: string): TrackMindWorkspaceDefinition {
  return TRACKMIND_WORKSPACE_DEFINITIONS[normalizeTrackMindRoleId(role)];
}

export function filterWorkspaceQuickActions(
  role: string,
  can: (permission: string) => boolean,
): TrackMindQuickAction[] {
  const workspace = getTrackMindWorkspaceDefinition(role);
  return workspace.quickActions.filter((action) => can(action.permission));
}

export function filterWorkspaceKpiKeys(
  role: string,
  can: (permission: string) => boolean,
): string[] {
  const workspace = getTrackMindWorkspaceDefinition(role);
  return workspace.kpiPermissionKeys.filter((key) => can(key));
}
