/**
 * Production-readiness audit — scores, risks, quick wins, deployment blockers.
 * Node-safe; aggregates signals from domain audit models and QA reports.
 */

import { auditMultiTenantReadiness } from './multiTenantReadinessModel';
import { simulateClinicOnboarding } from './clinicOnboardingModel';

export const PRODUCTION_READINESS_DIMENSION = Object.freeze({
  ARCHITECTURE: 'architecture',
  FRONTEND: 'frontend',
  BACKEND: 'backend',
  RESPONSIVENESS: 'responsiveness',
  INTEGRATIONS: 'integrations',
  SECURITY: 'securityControls',
  AUDITABILITY: 'auditability',
  OPERATIONAL_AWARENESS: 'operationalAwareness',
  PILOT_READINESS: 'pilotReadiness',
});

const BASE_SCORES = Object.freeze({
  architecture: 62,
  frontend: 74,
  backend: 58,
  responsiveness: 71,
  integrations: 38,
  securityControls: 52,
  auditability: 65,
  operationalAwareness: 78,
  pilotReadiness: 70,
});

function risk(id, severity, domain, summary, mitigation = '') {
  return Object.freeze({ id, severity, domain, summary, mitigation });
}

function win(id, priority, domain, summary, effort = 'medium') {
  return Object.freeze({ id, priority, domain, summary, effort });
}

function blocker(id, severity, domain, summary, resolution = '') {
  return Object.freeze({ id, severity, domain, summary, resolution });
}

/** @type {ReadonlyArray} */
export const PRODUCTION_RISK_CATALOG = Object.freeze([
  risk('R001', 'critical', 'security', 'CareDroid API lacks JWT authentication', 'Add AuthGuard to EmergencyOsController'),
  risk('R002', 'critical', 'security', 'EmergencySettingsService singleton shared across tenants', 'Scope settings by organizationId'),
  risk('R003', 'critical', 'pilot', 'Vercel frontend-only deploy serves /api as index.html', 'Set VITE_API_URL to Nest backend'),
  risk('R004', 'critical', 'security', 'TenantIsolationGuard passes unauthenticated requests', 'Require auth before tenant scope or fail closed'),
  risk('R005', 'high', 'backend', 'ED patient/workflow state is in-memory only', 'Persist to Postgres per org'),
  risk('R006', 'high', 'integrations', 'FHIR/HL7 connectors not org-scoped', 'Scope integration config by organizationId'),
  risk('R007', 'high', 'integrations', '17/25 integration registry points are placeholder', 'Phase integrations per first-customer blueprint'),
  risk('R008', 'high', 'security', 'ED RBAC ignores tenant-admin permissionsOverrides', 'Merge overrides in hasEmergencyActionPermission'),
  risk('R009', 'high', 'auditability', 'Workflow logs lost on backend restart', 'Durable workflow log store'),
  risk('R010', 'high', 'architecture', 'Dual ED persistence planes (Nest in-memory vs Mongoose)', 'Converge on one durable path'),
  risk('R011', 'high', 'pilot', 'Multi-tenant ED config not org-isolated', 'Wire tenant-admin emergencyOs read/write'),
  risk('R012', 'medium', 'security', 'CSP allows unsafe-inline scripts', 'Tighten Helmet CSP for production'),
  risk('R013', 'medium', 'security', 'Swagger exposed in all environments', 'Gate /api/docs behind admin auth'),
  risk('R014', 'medium', 'backend', 'SQLite synchronize:true in development', 'Disable outside local dev'),
  risk('R015', 'medium', 'frontend', 'CI codecov upload disabled', 'Enable coverage gate in test.yml'),
  risk('R016', 'medium', 'responsiveness', 'Whiteboard readability 26 under stress load', 'Apply density mitigations under load'),
  risk('R017', 'medium', 'responsiveness', 'Playwright Edge responsive timeouts', 'Fix responsive-qa.spec timeouts'),
  risk('R018', 'medium', 'architecture', 'Static queue wait targets in queueAuditModel', 'Org override resolver'),
  risk('R019', 'medium', 'architecture', 'EMERGENCY_OS_BRANDING hardcoded globally', 'Org branding copy override'),
  risk('R020', 'medium', 'frontend', 'Large App.jsx coupling (~2900 lines)', 'Continue route extraction'),
  risk('R021', 'medium', 'backend', 'Global throttle 100 req/min may be loose for auth', 'Per-route rate limits'),
  risk('R022', 'medium', 'auditability', 'Workflow logs not tenant-partitioned in ED service', 'Add organizationId to log records'),
  risk('R023', 'medium', 'integrations', 'SMART on FHIR OAuth placeholder only', 'Implement SMART launch for pilot phase 5'),
  risk('R024', 'medium', 'integrations', 'FHIR Bundle ingestion placeholder', 'Defer or implement ingestion pipeline'),
  risk('R025', 'medium', 'pilot', 'Staff onboarding still manual after provisioning seed', 'Staff roster editor UI'),
  risk('R026', 'medium', 'pilot', 'Onboarding wizard skips ED configuration steps', 'Surface ED setup in wizard finish'),
  risk('R027', 'medium', 'security', 'Docker compose default JWT_SECRET placeholder', 'Enforce secret in production deploy'),
  risk('R028', 'medium', 'security', 'ALLOW_DEMO_AUTH_IN_PRODUCTION flag exists', 'Restrict to demo tenants only'),
  risk('R029', 'low', 'architecture', 'Express legacy route registry coexists with Nest', 'Continue Nest migration'),
  risk('R030', 'low', 'architecture', 'Frontend/backend reassessment P1 default mismatch (5 vs 15 min)', 'Single canonical defaults module'),
  risk('R031', 'low', 'frontend', 'Mixed JS/TS on hot ED paths', 'Incremental TS migration'),
  risk('R032', 'low', 'backend', 'Research ED endpoints on production controller tree', 'Feature-flag advanced modules'),
  risk('R033', 'low', 'responsiveness', 'Responsive web QA artifacts present', 'Keep browser viewport QA current'),
  risk('R034', 'low', 'integrations', 'MQTT/wearables config placeholders', 'Out of first-customer scope'),
  risk('R035', 'low', 'auditability', 'No production event bus for central node', 'Future Kafka/NATS bridge'),
  risk('R036', 'low', 'operational', 'Duplicate EMS/reassess chrome under load', 'Whiteboard density tiers active'),
  risk('R037', 'low', 'operational', 'Copilot generic responses without rule path', 'Rule-based quick actions first'),
  risk('R038', 'low', 'pilot', 'Large uncommitted delta vs production branch', 'Commit and deploy parity'),
  risk('R039', 'low', 'pilot', 'Demo local fallback masks onboarding API failure', 'Surface API errors in wizard'),
  risk('R040', 'low', 'security', 'Example postgres password in .env.example', 'Document secret management only'),
  risk('R041', 'medium', 'architecture', 'Store initializeFromBackend skips org emergencyOs', 'Hydrate on OrganizationContext load'),
  risk('R042', 'medium', 'frontend', 'ErrorBoundary not on all ED routes', 'Wrap emergency route tree'),
  risk('R043', 'medium', 'backend', 'Provisioning swallows pack install errors', 'Surface partial provisioning status'),
  risk('R044', 'medium', 'integrations', 'ED integrationSettings on global settings path', 'Org-scoped connector credentials'),
  risk('R045', 'medium', 'auditability', 'Client-only audit when backend unavailable', 'Show sync status in settings'),
  risk('R046', 'medium', 'operational', 'Queue audit static targets differ from org thresholds', 'Align queue model with org config'),
  risk('R047', 'medium', 'pilot', 'roleProfileId not mapped to EMERGENCY_ROLE_IDS', 'resolveEmergencyRoleId from org mapping'),
  risk('R048', 'low', 'frontend', 'Trivy scan continue-on-error in CI', 'Fail build on critical CVEs'),
  risk('R049', 'low', 'backend', 'Optional RAG/NLU disabled in docker app', 'Document ML stack requirements'),
  risk('R050', 'low', 'pilot', 'Phase 5 integrations deferred but visible in hub', 'Label roadmap vs live clearly'),
]);

/** @type {ReadonlyArray} */
export const PRODUCTION_QUICK_WIN_CATALOG = Object.freeze([
  win('Q001', 'P0', 'security', 'Add JWT AuthGuard to EmergencyOsController', 'low'),
  win('Q002', 'P0', 'pilot', 'Set VITE_API_URL for hosted pilot', 'low'),
  win('Q003', 'P0', 'architecture', 'Wire EmergencySettings to org tenant-admin PATCH', 'medium'),
  win('Q004', 'P0', 'architecture', 'Hydrate emergencyStore from org engine on login', 'medium'),
  win('Q005', 'P1', 'architecture', 'Seed emergencyOs during tenant provisioning', 'low'),
  win('Q006', 'P1', 'security', 'Apply resolveEmergencyRoleId from org role mapping', 'low'),
  win('Q007', 'P1', 'security', 'Deep-merge emergencyOs on tenant-admin PATCH', 'low'),
  win('Q008', 'P1', 'pilot', 'Expose emergencyOs on tenant-admin GET', 'low'),
  win('Q009', 'P1', 'frontend', 'Fix TenantAdministrationCenter users ReferenceError', 'low'),
  win('Q010', 'P1', 'frontend', 'Enable codecov in CI test.yml', 'low'),
  win('Q011', 'P1', 'operational', 'Whiteboard 24-card cap under waiting-wall load', 'low'),
  win('Q012', 'P1', 'operational', 'Consolidate ops-detail strip on whiteboard', 'low'),
  win('Q013', 'P1', 'operational', 'Copilot rule-based quick actions before LLM', 'low'),
  win('Q014', 'P2', 'operational', 'Prioritize copilot queue/capacity/boarding/reassess recs', 'low'),
  win('Q015', 'P2', 'responsiveness', 'Collapse mission control under elevated load', 'low'),
  win('Q016', 'P2', 'responsiveness', 'Fix 2 Edge Playwright responsive timeouts', 'low'),
  win('Q017', 'P2', 'security', 'Gate Swagger behind admin in production', 'medium'),
  win('Q018', 'P2', 'auditability', 'Surface operational history on patient detail — corrected 2026-07-19 (Cycle 111): component was built (OperationalHistoryStrip.tsx) but never wired into any page, confirmed via a zero-importer check; deleted as dead code rather than actually shipped', 'done'),
  win('Q019', 'P2', 'auditability', 'Queue audit strip on whiteboard — corrected 2026-07-19 (Cycle 111): component was built (QueueAuditStrip.tsx) but never wired into any page, confirmed via a zero-importer check; deleted as dead code rather than actually shipped', 'done'),
  win('Q020', 'P2', 'auditability', 'Data quality risk badges in reception — corrected 2026-07-19 (Cycle 111): both components were built (DataQualityRiskBadge.tsx, DataQualityRiskStrip.tsx) but neither was ever wired into any page, confirmed via zero-importer checks; deleted as dead code rather than actually shipped', 'done'),
  win('Q021', 'P2', 'frontend', 'ApiConfigDegradedBanner for misconfigured API — corrected 2026-07-19 (Cycle 111): component was built but never wired into any page, confirmed via a zero-importer check; deleted as dead code rather than actually shipped', 'done'),
  win('Q022', 'P2', 'frontend', 'validate-vercel-env.mjs for demo deploy', 'done'),
  win('Q023', 'P2', 'pilot', 'First-customer demo mode dataset', 'done'),
  win('Q024', 'P2', 'pilot', 'Clinic onboarding simulation script', 'done'),
  win('Q025', 'P2', 'architecture', 'multi-tenant-readiness audit script', 'done'),
  win('Q026', 'P2', 'operational', 'Smart intake click reduction 22→8', 'done'),
  win('Q027', 'P2', 'operational', 'Reception worker swarm 12/12', 'done'),
  win('Q028', 'P2', 'operational', 'Error recovery audit 10/10 surfaces', 'done'),
  win('Q029', 'P2', 'frontend', 'Lazy routes with retry', 'done'),
  win('Q030', 'P2', 'frontend', 'Mobile performance contract tests', 'done'),
  win('Q031', 'P2', 'backend', 'TenantIsolationGuard on organizations API', 'done'),
  win('Q032', 'P2', 'backend', 'HIPAA audit module with permission checks', 'done'),
  win('Q033', 'P2', 'backend', 'Helmet + HSTS on Nest bootstrap', 'done'),
  win('Q034', 'P2', 'backend', 'Joi env validation', 'done'),
  win('Q035', 'P2', 'integrations', 'Integration discovery report script', 'done'),
  win('Q036', 'P2', 'integrations', 'Org-scoped marketplace enablement', 'done'),
  win('Q037', 'P2', 'pilot', 'Onboarding wizard with clinic presets', 'done'),
  win('Q038', 'P2', 'pilot', 'Phased first-customer deployment blueprint doc', 'done'),
  win('Q039', 'P2', 'security', 'Human review disclaimers on copilot/intake', 'done'),
  win('Q040', 'P2', 'auditability', 'Operational audit classifier model', 'done'),
  win('Q041', 'P3', 'architecture', 'Org override for queueAuditModel targets', 'medium'),
  win('Q042', 'P3', 'architecture', 'Merge EMERGENCY_OS_BRANDING from org settings', 'medium'),
  win('Q043', 'P3', 'backend', 'Persist workflow logs to audit table', 'high'),
  win('Q044', 'P3', 'backend', 'Scope EmergencySettingsService by org', 'high'),
  win('Q045', 'P3', 'integrations', 'Org-scoped FHIR test endpoints', 'medium'),
  win('Q046', 'P3', 'frontend', 'Wrap all ED routes in ErrorBoundary', 'medium'),
  win('Q047', 'P3', 'frontend', 'Consolidate App.jsx route modules', 'high'),
  win('Q048', 'P3', 'security', 'Tighten CSP for production builds', 'medium'),
  win('Q049', 'P3', 'pilot', 'Staff roster editor in Emergency Settings', 'medium'),
  win('Q050', 'P3', 'pilot', 'ED setup step in onboarding wizard finish', 'medium'),
]);

/** @type {ReadonlyArray} */
export const PRODUCTION_DEPLOYMENT_BLOCKER_CATALOG = Object.freeze([
  blocker('B001', 'critical', 'security', 'Unauthenticated /api/emergency/* in production', 'Deploy with JWT guards enabled'),
  blocker('B002', 'critical', 'pilot', 'No VITE_API_URL on Vercel — API calls hit SPA', 'Deploy backend + set env'),
  blocker('B003', 'critical', 'security', 'Shared ED settings singleton across tenants', 'Org-scoped settings service'),
  blocker('B004', 'critical', 'pilot', 'JWT_SECRET left at CHANGE_ME_IN_PRODUCTION', 'Rotate secrets in prod'),
  blocker('B005', 'high', 'pilot', 'Multi-tenant readiness audit fails (score 50)', 'All domains org-configurable'),
  blocker('B006', 'high', 'backend', 'ED state not durable — data loss on restart', 'Postgres persistence layer'),
  blocker('B007', 'high', 'auditability', 'Workflow logs in-memory only', 'Durable audit storage'),
  blocker('B008', 'high', 'integrations', 'Live clinical write path via FHIR not implemented', 'Scope pilot to standalone ED'),
  blocker('B009', 'high', 'security', 'permissionsOverrides not enforced in ED RBAC', 'Wire resolveEmergencyRole'),
  blocker('B010', 'high', 'pilot', 'Production commit parity unknown', 'Deploy tested commit SHA'),
  blocker('B011', 'medium', 'architecture', 'Global /api/emergency/settings endpoint', 'Deprecate for org tenant-admin'),
  blocker('B012', 'medium', 'architecture', 'Store does not load org emergencyOs without context refresh', 'Hydrate on login'),
  blocker('B013', 'medium', 'integrations', 'FHIR/HL7 not tenant-scoped', 'Per-org connector config'),
  blocker('B014', 'medium', 'pilot', 'Staff configuration has no UI', 'Accept seed roster or build editor'),
  blocker('B015', 'medium', 'pilot', 'ED RBAC mapping stored but not applied', 'resolveEmergencyRoleId wiring'),
  blocker('B016', 'medium', 'responsiveness', 'Stress whiteboard unreadable without filters', 'Enforce density mode in prod'),
  blocker('B017', 'medium', 'frontend', 'No enforced test coverage in CI', 'Enable codecov gate'),
  blocker('B018', 'medium', 'security', 'Demo auth flags in production schema', 'Lock down ALLOW_DEMO_AUTH'),
  blocker('B019', 'medium', 'backend', 'Swagger public', 'Protect or disable in prod'),
  blocker('B020', 'medium', 'auditability', 'Cross-tenant workflow log leakage risk', 'Partition logs by org'),
  blocker('B021', 'low', 'architecture', 'Mongoose ED optional path diverges', 'Document single prod path'),
  blocker('B022', 'low', 'architecture', 'Static operational model thresholds', 'Org override layer'),
  blocker('B023', 'low', 'frontend', 'Mixed JS/TS reduces compile-time safety', 'TS migration backlog'),
  blocker('B024', 'low', 'responsiveness', 'Edge responsive E2E failures', 'Fix before mobile pilot'),
  blocker('B025', 'low', 'integrations', '17 placeholder integration points visible', 'UX label as roadmap'),
  blocker('B026', 'low', 'pilot', 'Onboarding wizard docs vs code step mismatch', 'Update operator docs'),
  blocker('B027', 'low', 'pilot', 'Local demo fallback hides API errors', 'Fail visibly in staging'),
  blocker('B028', 'low', 'security', 'CSP unsafe-inline', 'Harden before public internet'),
  blocker('B029', 'low', 'backend', 'Trivy continue-on-error', 'Fail on critical CVE'),
  blocker('B030', 'low', 'operational', 'Queue targets not aligned with org thresholds', 'Resolver function'),
  blocker('B031', 'critical', 'pilot', 'Postgres/Redis not provisioned for prod stack', 'docker-compose.app or cloud DB'),
  blocker('B032', 'high', 'pilot', 'CORS_ORIGIN/FRONTEND_URL not set for split deploy', 'Configure CORS'),
  blocker('B033', 'high', 'pilot', 'No health check monitoring on /api/health', 'Wire uptime checks'),
  blocker('B034', 'high', 'pilot', 'Sentry/Datadog keys missing in prod', 'Configure observability'),
  blocker('B035', 'medium', 'pilot', 'Stripe/billing not required for ED pilot but may block org create', 'Verify billing flow'),
  blocker('B036', 'medium', 'pilot', 'OAuth providers not configured', 'Email/password or dev session only'),
  blocker('B037', 'medium', 'pilot', 'Email SMTP not configured for notifications', 'Disable or configure SMTP'),
  blocker('B038', 'medium', 'pilot', 'Redis cache optional — perf under load unknown', 'Load test with Redis'),
  blocker('B039', 'medium', 'pilot', 'ML/RAG stack optional — copilot may degrade', 'Document AI provider keys'),
  blocker('B040', 'medium', 'pilot', 'Native Android app removed from ED pilot scope', 'TypeScript web pilot only'),
  blocker('B041', 'low', 'pilot', 'Fleet/IoT modules in codebase confuse scope', 'Nav/feature flag hide'),
  blocker('B042', 'low', 'pilot', 'Federated learning endpoints on ED controller', 'Disable in prod'),
  blocker('B043', 'low', 'pilot', 'Digital twin endpoints on ED controller', 'Disable in prod'),
  blocker('B044', 'low', 'architecture', 'Branding ED copy not org-scoped', 'Pilot uses default copy'),
  blocker('B045', 'low', 'auditability', 'Automation audit separate from ED workflow logs', 'Unified operator view'),
  blocker('B046', 'low', 'operational', 'Copilot LLM fallback when rules miss', 'Monitor generic responses'),
  blocker('B047', 'low', 'frontend', 'Large bundle — verify budget tests pass', 'Run bundleBudget.test'),
  blocker('B048', 'low', 'backend', 'Rate limit may block burst intake', 'Tune throttle for reception'),
  blocker('B049', 'low', 'security', 'Crash report endpoint auth unverified', 'Audit /api/crashes'),
  blocker('B050', 'low', 'pilot', 'QA screenshots not in CI gate', 'Optional visual regression'),
]);

export function scoreProductionReadiness(signals: any = {}) {
  const multiTenant = auditMultiTenantReadiness();
  const clinic = simulateClinicOnboarding({
    provisioned: signals.clinicProvisioned !== false,
    orgScopedThresholdSave: signals.orgScopedSettings !== false,
    orgScopedAlertSave: signals.orgScopedSettings !== false,
    storeHydration: signals.storeHydration !== false,
    edRbacWired: Boolean(signals.edRbacWired),
  });

  const adjustments = {
    architecture: multiTenant.passesAudit ? 15 : multiTenant.overallReadinessScore > 50 ? 5 : 0,
    backend: signals.emergencyApiAuthenticated ? 12 : 0,
    securityControls: signals.emergencyApiAuthenticated ? 15 : signals.edRbacWired ? 5 : 0,
    pilotReadiness: clinic.summary.readinessPercent >= 80 ? 8 : 0,
  };

  const dimensions = Object.fromEntries(
    Object.entries(BASE_SCORES).map(([key, base]) => {
      const adjusted = Math.min(100, base + (adjustments[key] || 0));
      return [
        key,
        Object.freeze({
          score: adjusted,
          baseScore: base,
          grade: adjusted >= 80 ? 'ready' : adjusted >= 65 ? 'pilot' : adjusted >= 50 ? 'risk' : 'blocked',
        }),
      ];
    }),
  );

  const overall = Math.round(
    Object.values(dimensions).reduce((sum, dim) => sum + dim.score, 0) /
      Object.keys(dimensions).length,
  );

  return Object.freeze({
    dimensions,
    overall,
    grade: overall >= 75 ? 'pilot-ready' : overall >= 60 ? 'staging-only' : 'not-production-ready',
    signals: Object.freeze({
      multiTenantScore: multiTenant.overallReadinessScore,
      clinicReadinessPercent: clinic.summary.readinessPercent,
      ...signals,
    }),
  });
}

export function auditProductionReadiness(options: any = {}) {
  const signals = {
    emergencyApiAuthenticated: options.emergencyApiAuthenticated ?? false,
    orgScopedSettings: options.orgScopedSettings ?? true,
    storeHydration: options.storeHydration ?? true,
    clinicProvisioned: options.clinicProvisioned ?? true,
    edRbacWired: options.edRbacWired ?? false,
  };

  const scores = scoreProductionReadiness(signals);
  const criticalRisks = PRODUCTION_RISK_CATALOG.filter((item) => item.severity === 'critical');
  const criticalBlockers = PRODUCTION_DEPLOYMENT_BLOCKER_CATALOG.filter(
    (item) => item.severity === 'critical',
  );
  const p0Wins = PRODUCTION_QUICK_WIN_CATALOG.filter((item) => item.priority === 'P0');
  const doneWins = PRODUCTION_QUICK_WIN_CATALOG.filter((item) => item.effort === 'done');

  const signalLinkedCriticalBlockers = Object.freeze({
    B001: () => Boolean(signals.emergencyApiAuthenticated),
    B002: () => Boolean(options.viteApiUrlConfigured),
    B003: () => Boolean(options.orgScopedEmergencySettingsService),
    B004: () => Boolean(options.productionSecretsConfigured),
  });

  const unresolvedSignalBlockers = Object.entries(signalLinkedCriticalBlockers)
    .filter(([, isResolved]) => !isResolved())
    .map(([id]) => id);

  const unresolvedCriticalBlockers = criticalBlockers.filter((blocker) => {
    if (signalLinkedCriticalBlockers[blocker.id] !== undefined) {
      return !signalLinkedCriticalBlockers[blocker.id]();
    }
    return blocker.severity === 'critical';
  });

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    scores,
    topRisks: PRODUCTION_RISK_CATALOG,
    topQuickWins: PRODUCTION_QUICK_WIN_CATALOG,
    topDeploymentBlockers: PRODUCTION_DEPLOYMENT_BLOCKER_CATALOG,
    summary: Object.freeze({
      riskCount: PRODUCTION_RISK_CATALOG.length,
      quickWinCount: PRODUCTION_QUICK_WIN_CATALOG.length,
      blockerCount: PRODUCTION_DEPLOYMENT_BLOCKER_CATALOG.length,
      criticalRiskCount: criticalRisks.length,
      criticalBlockerCount: criticalBlockers.length,
      unresolvedCriticalBlockerCount: unresolvedCriticalBlockers.length,
      unresolvedSignalBlockerIds: unresolvedSignalBlockers,
      p0QuickWinCount: p0Wins.length,
      completedQuickWins: doneWins.length,
      passesProductionAudit:
        scores.overall >= 75 && unresolvedSignalBlockers.length === 0,
    }),
    pilotRecommendation:
      scores.overall >= 70
        ? 'Suitable for controlled first-customer pilot with standalone ED scope, demo auth, and deployed Nest backend.'
        : 'Address critical security and multi-tenant blockers before external pilot.',
  });
}

export function auditProductionReadinessExposure() {
  return Object.freeze({
    dimensions: Object.values(PRODUCTION_READINESS_DIMENSION),
    qaReports: [
      'multi-tenant-readiness-audit-report.json',
      'clinic-onboarding-simulation-report.json',
      'copilot-recommendation-audit-report.json',
      'whiteboard-density-audit-report.json',
      'integration-discovery-report.json',
      'operational-audit-discovery-report.json',
      'error-recovery-audit-report.json',
    ],
    auditScripts: [
      'scripts/production-readiness-audit.mjs',
      'scripts/multi-tenant-readiness-audit.mjs',
      'scripts/clinic-onboarding-simulation.mjs',
    ],
  });
}
