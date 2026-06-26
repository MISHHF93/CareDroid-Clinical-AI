/**
 * TrackMind Nexus permission registry — routes, actions, sensitivity, and role grants.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  TRACKMIND_ROLE_ID,
  normalizeTrackMindRoleId,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';

export const TRACKMIND_SENSITIVITY = Object.freeze({
  public: 'public',
  operational: 'operational',
  internal: 'internal',
  medical: 'medical',
  welfare: 'welfare',
  financial: 'financial',
  security: 'security',
  personnel: 'personnel',
  federation: 'federation',
  platform: 'platform',
} as const);

export type TrackMindSensitivity =
  (typeof TRACKMIND_SENSITIVITY)[keyof typeof TRACKMIND_SENSITIVITY];

export type TrackMindPermissionCategory =
  | 'route'
  | 'action'
  | 'workspace'
  | 'kpi'
  | 'audit'
  | 'approval'
  | 'export'
  | 'admin';

export type TrackMindPermissionDefinition = Readonly<{
  key: string;
  category: TrackMindPermissionCategory;
  label: string;
  description: string;
  sensitivity: TrackMindSensitivity;
  scope: 'platform' | 'federation' | 'organization' | 'racetrack' | 'assigned';
  blockedForReadOnlyRole?: boolean;
}>;

export const TRACKMIND_PERMISSION_KEYS = Object.freeze({
  workspaceView: 'trackmind.workspace.view',
  maturityView: 'trackmind.maturity.view',
  enterpriseView: 'trackmind.enterprise.view',
  intelligenceView: 'trackmind.intelligence.view',
  platformAdminView: 'trackmind.platform_admin.view',
  tenantAdminView: 'trackmind.tenant_admin.view',
  governanceRegistryView: 'trackmind.governance_registry.view',
  auditView: 'trackmind.audit.view',
  auditExport: 'trackmind.audit.export',
  approvalRequest: 'trackmind.approval.request',
  approvalReview: 'trackmind.approval.review',
  approvalDecide: 'trackmind.approval.decide',
  approvalEscalate: 'trackmind.approval.escalate',
  racedayStatusUpdate: 'raceday.status.update',
  racedayIncidentCommand: 'raceday.incident.command',
  stewardIncidentReview: 'steward.incident.review',
  stewardDecisionCreate: 'steward.decision.create',
  starterReadinessUpdate: 'starter.readiness.update',
  paddockObservationCreate: 'paddock.observation.create',
  paddockReadinessUpdate: 'paddock.readiness.update',
  welfareObservationCreate: 'welfare.observation.create',
  welfareRestrictionReview: 'welfare.restriction.review',
  veterinaryRecordWrite: 'veterinary.record.write',
  veterinaryRecordView: 'veterinary.record.view',
  horseOpsManage: 'horse_ops.manage',
  securityIncidentManage: 'security.incident.manage',
  securityAuditExport: 'security.audit.export',
  facilitiesInspectionCreate: 'facilities.inspection.create',
  facilitiesMaintenanceManage: 'facilities.maintenance.manage',
  complianceEvidenceAttach: 'compliance.evidence.attach',
  complianceReportExport: 'compliance.report.export',
  financeReportView: 'finance.report.view',
  financeRecordManage: 'finance.record.manage',
  fanExperienceManage: 'fan.experience.manage',
  executiveDashboardView: 'executive.dashboard.view',
  analyticsView: 'trackmind.analytics.view',
  analyticsExport: 'trackmind.analytics.export',
  supportDiagnosticsView: 'support.diagnostics.view',
  supportImpersonate: 'support.impersonate',
  orgUserManage: 'org.user.manage',
  racetrackConfigManage: 'racetrack.config.manage',
  platformTenantManage: 'platform.tenant.manage',
  moduleEntitlementManage: 'platform.module.manage',
  kpiExecutiveView: 'kpi.executive.view',
  kpiRaceDayView: 'kpi.raceday.view',
  kpiWelfareView: 'kpi.welfare.view',
  kpiFacilitiesView: 'kpi.facilities.view',
  kpiSecurityView: 'kpi.security.view',
  kpiComplianceView: 'kpi.compliance.view',
  kpiFinanceView: 'kpi.finance.view',
  kpiFanView: 'kpi.fan.view',
  notificationOperational: 'notification.operational.receive',
  notificationApproval: 'notification.approval.receive',
  notificationExecutive: 'notification.executive.receive',
  surveillanceNexusView: 'surveillance.nexus.view',
  surveillanceCameraManage: 'surveillance.camera.manage',
  surveillanceIotManage: 'surveillance.iot.manage',
  surveillanceHealthView: 'surveillance.health.view',
  surveillanceRuleManage: 'surveillance.rule.manage',
  surveillanceIncidentLink: 'surveillance.incident.link',
  kpiSurveillanceView: 'kpi.surveillance.view',
} as const);

const K = TRACKMIND_PERMISSION_KEYS;
const S = TRACKMIND_SENSITIVITY;

export const TRACKMIND_PERMISSION_REGISTRY: readonly TrackMindPermissionDefinition[] =
  Object.freeze([
    { key: K.workspaceView, category: 'workspace', label: 'Role workspace', description: 'Access TrackMind role-resonant workspace.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.maturityView, category: 'route', label: 'Maturity dashboard', description: 'View TrackMind maturity assessment.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.enterpriseView, category: 'route', label: 'Enterprise platform', description: 'View enterprise operating platform hub.', sensitivity: S.internal, scope: 'organization' },
    { key: K.intelligenceView, category: 'route', label: 'Platform intelligence', description: 'View platform intelligence modules.', sensitivity: S.internal, scope: 'organization' },
    { key: K.platformAdminView, category: 'route', label: 'Platform admin', description: 'Platform-wide administration surfaces.', sensitivity: S.platform, scope: 'platform' },
    { key: K.tenantAdminView, category: 'route', label: 'Tenant admin', description: 'Tenant administration center.', sensitivity: S.platform, scope: 'organization' },
    { key: K.governanceRegistryView, category: 'route', label: 'Governance registry', description: 'View governed artifact registry.', sensitivity: S.internal, scope: 'organization' },
    { key: K.auditView, category: 'audit', label: 'Audit trails', description: 'View operational and compliance audit trails.', sensitivity: S.internal, scope: 'organization' },
    { key: K.auditExport, category: 'export', label: 'Audit export', description: 'Export audit evidence packets.', sensitivity: S.internal, scope: 'organization', blockedForReadOnlyRole: true },
    { key: K.approvalRequest, category: 'approval', label: 'Request approval', description: 'Initiate governed approval workflows.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.approvalReview, category: 'approval', label: 'Review approval', description: 'Review pending approval requests.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.approvalDecide, category: 'approval', label: 'Approve / reject', description: 'Finalize approval decisions.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.approvalEscalate, category: 'approval', label: 'Escalate approval', description: 'Escalate stalled approvals.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.racedayStatusUpdate, category: 'action', label: 'Update race-day status', description: 'Update operational race-day readiness posture.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.racedayIncidentCommand, category: 'action', label: 'Race-day incident command', description: 'Coordinate race-day incidents.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.stewardIncidentReview, category: 'action', label: 'Review steward incidents', description: 'Review race incidents and evidence.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.stewardDecisionCreate, category: 'action', label: 'Create steward decision', description: 'Create stewarding decisions through governed workflows.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.starterReadinessUpdate, category: 'action', label: 'Update starter readiness', description: 'Update gate and race readiness indicators.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.paddockObservationCreate, category: 'action', label: 'Paddock observation', description: 'Log paddock observations and inspections.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.paddockReadinessUpdate, category: 'action', label: 'Paddock readiness', description: 'Update paddock readiness status.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.welfareObservationCreate, category: 'action', label: 'Welfare observation', description: 'Create equine welfare observations.', sensitivity: S.welfare, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.welfareRestrictionReview, category: 'action', label: 'Welfare restriction review', description: 'Review horse welfare restrictions.', sensitivity: S.welfare, scope: 'racetrack' },
    { key: K.veterinaryRecordWrite, category: 'action', label: 'Write veterinary record', description: 'Create or update veterinary records.', sensitivity: S.medical, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.veterinaryRecordView, category: 'action', label: 'View veterinary record', description: 'View privacy-scoped veterinary records.', sensitivity: S.medical, scope: 'racetrack' },
    { key: K.horseOpsManage, category: 'action', label: 'Horse operations', description: 'Manage horse operational records within scope.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.securityIncidentManage, category: 'action', label: 'Security incidents', description: 'Create and manage security incidents.', sensitivity: S.security, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.securityAuditExport, category: 'export', label: 'Security audit export', description: 'Export security audit records.', sensitivity: S.security, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.facilitiesInspectionCreate, category: 'action', label: 'Facilities inspection', description: 'Create facility inspections.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.facilitiesMaintenanceManage, category: 'action', label: 'Maintenance tasks', description: 'Manage maintenance and work orders.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.complianceEvidenceAttach, category: 'action', label: 'Attach compliance evidence', description: 'Attach compliance evidence to controls.', sensitivity: S.internal, scope: 'organization', blockedForReadOnlyRole: true },
    { key: K.complianceReportExport, category: 'export', label: 'Compliance export', description: 'Export compliance reports.', sensitivity: S.internal, scope: 'organization', blockedForReadOnlyRole: true },
    { key: K.financeReportView, category: 'action', label: 'Finance reports', description: 'View finance dashboards and reports.', sensitivity: S.financial, scope: 'organization' },
    { key: K.financeRecordManage, category: 'action', label: 'Finance records', description: 'Manage finance records within scope.', sensitivity: S.financial, scope: 'organization', blockedForReadOnlyRole: true },
    { key: K.fanExperienceManage, category: 'action', label: 'Fan experience', description: 'Manage ticketing and fan experience workflows.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.executiveDashboardView, category: 'kpi', label: 'Executive dashboard', description: 'View executive scorecards and summaries.', sensitivity: S.federation, scope: 'organization' },
    { key: K.analyticsView, category: 'kpi', label: 'Analytics', description: 'View analytics and trend dashboards.', sensitivity: S.internal, scope: 'organization' },
    { key: K.analyticsExport, category: 'export', label: 'Analytics export', description: 'Export analytics reports.', sensitivity: S.internal, scope: 'organization', blockedForReadOnlyRole: true },
    { key: K.supportDiagnosticsView, category: 'action', label: 'Support diagnostics', description: 'View tenant troubleshooting diagnostics.', sensitivity: S.platform, scope: 'platform' },
    { key: K.supportImpersonate, category: 'admin', label: 'Support impersonation', description: 'Governed support impersonation.', sensitivity: S.platform, scope: 'platform', blockedForReadOnlyRole: true },
    { key: K.orgUserManage, category: 'admin', label: 'Organization users', description: 'Manage users within organization scope.', sensitivity: S.personnel, scope: 'organization', blockedForReadOnlyRole: true },
    { key: K.racetrackConfigManage, category: 'admin', label: 'Racetrack configuration', description: 'Manage racetrack operational configuration.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.platformTenantManage, category: 'admin', label: 'Platform tenants', description: 'Manage organizations and tenants globally.', sensitivity: S.platform, scope: 'platform', blockedForReadOnlyRole: true },
    { key: K.moduleEntitlementManage, category: 'admin', label: 'Module entitlements', description: 'Enable or disable platform modules per tenant.', sensitivity: S.platform, scope: 'platform', blockedForReadOnlyRole: true },
    { key: K.kpiExecutiveView, category: 'kpi', label: 'Executive KPIs', description: 'Executive scorecard KPIs.', sensitivity: S.federation, scope: 'organization' },
    { key: K.kpiRaceDayView, category: 'kpi', label: 'Race-day KPIs', description: 'Race-day readiness and incident KPIs.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.kpiWelfareView, category: 'kpi', label: 'Welfare KPIs', description: 'Equine welfare trend KPIs.', sensitivity: S.welfare, scope: 'racetrack' },
    { key: K.kpiFacilitiesView, category: 'kpi', label: 'Facilities KPIs', description: 'Facilities readiness and maintenance KPIs.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.kpiSecurityView, category: 'kpi', label: 'Security KPIs', description: 'Security incident and access KPIs.', sensitivity: S.security, scope: 'racetrack' },
    { key: K.kpiComplianceView, category: 'kpi', label: 'Compliance KPIs', description: 'Compliance control and evidence KPIs.', sensitivity: S.internal, scope: 'organization' },
    { key: K.kpiFinanceView, category: 'kpi', label: 'Finance KPIs', description: 'Revenue, cost, and payout KPIs.', sensitivity: S.financial, scope: 'organization' },
    { key: K.kpiFanView, category: 'kpi', label: 'Fan experience KPIs', description: 'Ticketing and attendance KPIs.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.notificationOperational, category: 'action', label: 'Operational notifications', description: 'Receive operational alert notifications.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.notificationApproval, category: 'action', label: 'Approval notifications', description: 'Receive approval queue notifications.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.notificationExecutive, category: 'action', label: 'Executive notifications', description: 'Receive executive summary notifications.', sensitivity: S.federation, scope: 'organization' },
    { key: K.surveillanceNexusView, category: 'route', label: 'Surveillance nexus', description: 'View surveillance and IoT nexus dashboards.', sensitivity: S.security, scope: 'racetrack' },
    { key: K.surveillanceCameraManage, category: 'admin', label: 'Camera registry', description: 'Manage CCTV camera registry entries.', sensitivity: S.security, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.surveillanceIotManage, category: 'admin', label: 'IoT registry', description: 'Manage surveillance IoT device registry.', sensitivity: S.operational, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.surveillanceHealthView, category: 'kpi', label: 'Surveillance health', description: 'View surveillance platform health metrics.', sensitivity: S.operational, scope: 'racetrack' },
    { key: K.surveillanceRuleManage, category: 'action', label: 'Alert rules', description: 'Manage surveillance alert rules.', sensitivity: S.security, scope: 'racetrack', blockedForReadOnlyRole: true },
    { key: K.surveillanceIncidentLink, category: 'action', label: 'Incident linkage', description: 'Link surveillance events to security and race-day incidents.', sensitivity: S.security, scope: 'racetrack' },
    { key: K.kpiSurveillanceView, category: 'kpi', label: 'Surveillance KPIs', description: 'Camera, IoT, and zone coverage KPIs.', sensitivity: S.security, scope: 'racetrack' },
  ]);

const PERMISSION_BY_KEY = new Map(
  TRACKMIND_PERMISSION_REGISTRY.map((entry) => [entry.key, entry]),
);

const R = TRACKMIND_ROLE_ID;

const ALL_VIEW = [
  K.workspaceView,
  K.maturityView,
  K.auditView,
  K.analyticsView,
  K.notificationOperational,
] as const;

export const TRACKMIND_ROLE_PERMISSION_GRANTS: Record<TrackMindRoleId, readonly string[]> =
  Object.freeze({
    [R.platformSuperAdmin]: Object.freeze([
      ...ALL_VIEW,
      K.enterpriseView,
      K.intelligenceView,
      K.platformAdminView,
      K.tenantAdminView,
      K.governanceRegistryView,
      K.auditExport,
      K.approvalReview,
      K.approvalDecide,
      K.executiveDashboardView,
      K.analyticsExport,
      K.supportDiagnosticsView,
      K.supportImpersonate,
      K.orgUserManage,
      K.racetrackConfigManage,
      K.platformTenantManage,
      K.moduleEntitlementManage,
      K.kpiExecutiveView,
      K.kpiRaceDayView,
      K.kpiWelfareView,
      K.kpiFacilitiesView,
      K.kpiSecurityView,
      K.kpiComplianceView,
      K.kpiFinanceView,
      K.kpiFanView,
      K.notificationApproval,
      K.notificationExecutive,
      K.veterinaryRecordView,
      K.financeReportView,
      K.complianceReportExport,
      K.securityAuditExport,
      K.surveillanceNexusView,
      K.surveillanceCameraManage,
      K.surveillanceIotManage,
      K.surveillanceHealthView,
      K.surveillanceRuleManage,
      K.kpiSurveillanceView,
    ]),
    [R.organizationAdmin]: Object.freeze([
      ...ALL_VIEW,
      K.enterpriseView,
      K.intelligenceView,
      K.tenantAdminView,
      K.governanceRegistryView,
      K.auditExport,
      K.approvalReview,
      K.approvalDecide,
      K.orgUserManage,
      K.racetrackConfigManage,
      K.executiveDashboardView,
      K.analyticsExport,
      K.kpiExecutiveView,
      K.kpiComplianceView,
      K.kpiFinanceView,
      K.kpiFanView,
      K.financeReportView,
      K.complianceEvidenceAttach,
      K.complianceReportExport,
      K.notificationApproval,
      K.notificationExecutive,
    ]),
    [R.racetrackAdmin]: Object.freeze([
      ...ALL_VIEW,
      K.enterpriseView,
      K.intelligenceView,
      K.governanceRegistryView,
      K.auditExport,
      K.approvalReview,
      K.approvalDecide,
      K.orgUserManage,
      K.racetrackConfigManage,
      K.kpiRaceDayView,
      K.kpiWelfareView,
      K.kpiFacilitiesView,
      K.kpiSecurityView,
      K.kpiFanView,
      K.notificationApproval,
      K.racedayStatusUpdate,
      K.complianceEvidenceAttach,
    ]),
    [R.raceDayOperationsManager]: Object.freeze([
      K.workspaceView,
      K.maturityView,
      K.intelligenceView,
      K.auditView,
      K.approvalRequest,
      K.approvalReview,
      K.racedayStatusUpdate,
      K.racedayIncidentCommand,
      K.kpiRaceDayView,
      K.kpiFacilitiesView,
      K.kpiSecurityView,
      K.notificationOperational,
      K.notificationApproval,
      K.analyticsView,
      K.surveillanceNexusView,
      K.surveillanceHealthView,
      K.surveillanceIncidentLink,
      K.kpiSurveillanceView,
    ]),
    [R.steward]: Object.freeze([
      K.workspaceView,
      K.intelligenceView,
      K.auditView,
      K.stewardIncidentReview,
      K.stewardDecisionCreate,
      K.approvalRequest,
      K.approvalReview,
      K.kpiRaceDayView,
      K.notificationOperational,
      K.notificationApproval,
    ]),
    [R.starterRaceOfficial]: Object.freeze([
      K.workspaceView,
      K.intelligenceView,
      K.auditView,
      K.starterReadinessUpdate,
      K.approvalRequest,
      K.kpiRaceDayView,
      K.notificationOperational,
    ]),
    [R.paddockOfficial]: Object.freeze([
      K.workspaceView,
      K.auditView,
      K.paddockObservationCreate,
      K.paddockReadinessUpdate,
      K.approvalRequest,
      K.kpiRaceDayView,
      K.notificationOperational,
    ]),
    [R.equineWelfareOfficer]: Object.freeze([
      K.workspaceView,
      K.maturityView,
      K.auditView,
      K.welfareObservationCreate,
      K.welfareRestrictionReview,
      K.approvalRequest,
      K.kpiWelfareView,
      K.kpiRaceDayView,
      K.notificationOperational,
      K.surveillanceNexusView,
      K.surveillanceHealthView,
      K.kpiSurveillanceView,
    ]),
    [R.veterinarian]: Object.freeze([
      K.workspaceView,
      K.auditView,
      K.veterinaryRecordView,
      K.veterinaryRecordWrite,
      K.welfareRestrictionReview,
      K.approvalRequest,
      K.kpiWelfareView,
      K.notificationOperational,
      K.surveillanceNexusView,
      K.surveillanceHealthView,
      K.kpiSurveillanceView,
    ]),
    [R.trainerLiaison]: Object.freeze([
      K.workspaceView,
      K.auditView,
      K.horseOpsManage,
      K.approvalRequest,
      K.kpiRaceDayView,
      K.notificationOperational,
    ]),
    [R.securityManager]: Object.freeze([
      K.workspaceView,
      K.intelligenceView,
      K.auditView,
      K.securityIncidentManage,
      K.securityAuditExport,
      K.approvalRequest,
      K.approvalReview,
      K.kpiSecurityView,
      K.surveillanceNexusView,
      K.surveillanceCameraManage,
      K.surveillanceHealthView,
      K.surveillanceRuleManage,
      K.surveillanceIncidentLink,
      K.kpiSurveillanceView,
      K.notificationOperational,
    ]),
    [R.facilitiesManager]: Object.freeze([
      K.workspaceView,
      K.maturityView,
      K.auditView,
      K.facilitiesInspectionCreate,
      K.facilitiesMaintenanceManage,
      K.approvalRequest,
      K.kpiFacilitiesView,
      K.kpiRaceDayView,
      K.surveillanceNexusView,
      K.surveillanceHealthView,
      K.kpiSurveillanceView,
      K.notificationOperational,
    ]),
    [R.complianceOfficer]: Object.freeze([
      K.workspaceView,
      K.enterpriseView,
      K.intelligenceView,
      K.governanceRegistryView,
      K.auditView,
      K.auditExport,
      K.complianceEvidenceAttach,
      K.complianceReportExport,
      K.approvalReview,
      K.kpiComplianceView,
      K.notificationApproval,
      K.analyticsView,
    ]),
    [R.financeManager]: Object.freeze([
      K.workspaceView,
      K.intelligenceView,
      K.auditView,
      K.financeReportView,
      K.financeRecordManage,
      K.approvalReview,
      K.kpiFinanceView,
      K.notificationApproval,
      K.analyticsView,
    ]),
    [R.ticketingFanExperienceManager]: Object.freeze([
      K.workspaceView,
      K.intelligenceView,
      K.auditView,
      K.fanExperienceManage,
      K.kpiFanView,
      K.analyticsView,
      K.notificationOperational,
    ]),
    [R.executiveLeadership]: Object.freeze([
      K.workspaceView,
      K.maturityView,
      K.enterpriseView,
      K.intelligenceView,
      K.executiveDashboardView,
      K.auditView,
      K.approvalReview,
      K.kpiExecutiveView,
      K.kpiRaceDayView,
      K.kpiComplianceView,
      K.kpiFinanceView,
      K.analyticsView,
      K.notificationExecutive,
    ]),
    [R.auditorRegulator]: Object.freeze([
      K.workspaceView,
      K.maturityView,
      K.enterpriseView,
      K.intelligenceView,
      K.governanceRegistryView,
      K.auditView,
      K.auditExport,
      K.complianceReportExport,
      K.analyticsView,
    ]),
    [R.dataAnalyticsUser]: Object.freeze([
      K.workspaceView,
      K.maturityView,
      K.intelligenceView,
      K.analyticsView,
      K.analyticsExport,
      K.kpiExecutiveView,
      K.kpiRaceDayView,
      K.kpiWelfareView,
      K.kpiFacilitiesView,
      K.kpiSecurityView,
      K.kpiComplianceView,
      K.kpiFinanceView,
      K.kpiFanView,
    ]),
    [R.supportInternalOperator]: Object.freeze([
      K.workspaceView,
      K.platformAdminView,
      K.tenantAdminView,
      K.supportDiagnosticsView,
      K.supportImpersonate,
      K.auditView,
      K.intelligenceView,
      K.notificationOperational,
    ]),
    [R.genericStaff]: Object.freeze([
      K.workspaceView,
      K.auditView,
      K.notificationOperational,
    ]),
  });

export const TRACKMIND_ROUTE_PERMISSION_MAP: Record<string, string | null> = Object.freeze({
  [CANONICAL_ROUTES.trackMindWorkspace]: K.workspaceView,
  [CANONICAL_ROUTES.trackMindMaturity]: K.maturityView,
  [CANONICAL_ROUTES.enterprisePlatform]: K.enterpriseView,
  [CANONICAL_ROUTES.platformIntelligence]: K.intelligenceView,
  [CANONICAL_ROUTES.platformAdmin]: K.platformAdminView,
  [CANONICAL_ROUTES.tenantAdmin]: K.tenantAdminView,
  [CANONICAL_ROUTES.governanceRegistry]: K.governanceRegistryView,
  [CANONICAL_ROUTES.audit]: K.auditView,
  [CANONICAL_ROUTES.executive]: K.executiveDashboardView,
  [CANONICAL_ROUTES.billing]: K.financeReportView,
  [CANONICAL_ROUTES.regulatory]: K.complianceReportExport,
  [CANONICAL_ROUTES.surveillanceNexus]: K.surveillanceNexusView,
  [CANONICAL_ROUTES.hospitalMap]: K.surveillanceNexusView,
  [CANONICAL_ROUTES.medicalIot]: K.surveillanceIotManage,
  [CANONICAL_ROUTES.devices]: K.surveillanceIotManage,
  [CANONICAL_ROUTES.fleetCommand]: K.analyticsView,
  [CANONICAL_ROUTES.fleetMap]: K.analyticsView,
  [CANONICAL_ROUTES.adminOperations]: K.tenantAdminView,
});

export type TrackMindPermissionContext = {
  roleReadOnly?: boolean;
};

export function resolveTrackMindPermissionKey(
  permission: string | null | undefined,
): string | null {
  if (!permission) return null;
  return String(permission).trim();
}

export function listTrackMindPermissionsForRole(role: string): string[] {
  const roleId = normalizeTrackMindRoleId(role);
  return [...(TRACKMIND_ROLE_PERMISSION_GRANTS[roleId] || [])];
}

function roleGrants(
  role: string,
  overrides: Record<string, string[]> = {},
): Set<string> {
  const roleId = normalizeTrackMindRoleId(role);
  const base = TRACKMIND_ROLE_PERMISSION_GRANTS[roleId] || [];
  const merged = new Set(base);
  const extra = overrides[roleId] || overrides[role];
  if (Array.isArray(extra)) {
    for (const entry of extra) {
      const key = resolveTrackMindPermissionKey(entry);
      if (key) merged.add(key);
    }
  }
  return merged;
}

export function hasTrackMindPermission(
  role: string,
  permission: string,
  overrides: Record<string, string[]> = {},
  context: TrackMindPermissionContext = {},
): boolean {
  const key = resolveTrackMindPermissionKey(permission);
  if (!key) return false;
  const grants = roleGrants(role, overrides);
  if (!grants.has(key)) return false;
  const definition = PERMISSION_BY_KEY.get(key);
  if (definition?.blockedForReadOnlyRole && context.roleReadOnly) return false;
  return true;
}

export function canAccessTrackMindRoute(
  role: string,
  path: string,
  overrides: Record<string, string[]> = {},
  context: TrackMindPermissionContext = {},
): boolean {
  const permission = TRACKMIND_ROUTE_PERMISSION_MAP[path];
  if (!permission) return true;
  return hasTrackMindPermission(role, permission, overrides, context);
}

export function canPerformTrackMindMutation(
  role: string,
  permission: string,
  overrides: Record<string, string[]> = {},
  context: TrackMindPermissionContext = {},
): boolean {
  if (context.roleReadOnly) return false;
  return hasTrackMindPermission(role, permission, overrides, context);
}
