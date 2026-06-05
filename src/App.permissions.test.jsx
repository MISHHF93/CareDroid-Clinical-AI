import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  getFrontendVisibleToolInventory,
  TOOL_EXECUTOR_STATUS,
  TOOL_PERMISSION_LOGIC,
} from './data/toolInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, 'App.jsx'), 'utf8');

function routeBlock(path) {
  const pathIndex = appSource.indexOf(`path: '${path}'`);
  const blockEnd = appSource.indexOf('\n    },', pathIndex + 1);
  return appSource.slice(pathIndex, blockEnd === -1 ? undefined : blockEnd + 7);
}

describe('App clinical-intelligence route permissions', () => {
  it('wraps authenticated routes in TenantRequired before rendering the app shell', () => {
    expect(appSource).toContain("import { TenantContextProvider, TenantRequired }");
    expect(appSource).toContain('<TenantRequired>');
    expect(appSource).toContain('<AppShellPage>{resolvedElement}</AppShellPage>');
  });

  it.each(['/dashboard', '/tools', '/assistant', '/profile', '/organization'])(
    '%s is an authenticated tenant-gated route',
    (path) => {
      const block = routeBlock(path);

      expect(block).toContain(`path: '${path}'`);
      expect(block).toContain('requiresAuth: true');
    },
  );

  it.each([
    '/tools/ambient-scribe',
    '/tools/differential-ai',
    '/tools/timeline-ai',
    '/tools/patient-summary-ai',
    '/tools/order-set-ai',
    '/tools/ai-explainability',
  ])('%s requires PHI read and AI chat permissions', (path) => {
    const block = routeBlock(path);

    expect(block).toContain('Permission.READ_PHI');
    expect(block).toContain('Permission.USE_AI_CHAT');
    expect(block).toContain('requireAllPermissions: true');
  });

  it('keeps guideline RAG available to USE_AI_CHAT users', () => {
    const block = routeBlock('/tools/guideline-rag');

    expect(block).toContain('permission: Permission.USE_AI_CHAT');
    expect(block).not.toContain('Permission.READ_PHI');
  });

  it('matches Clinical Audit to the backend audit-log permission', () => {
    const block = routeBlock('/tools/clinical-audit');

    expect(block).toContain('permission: Permission.VIEW_AUDIT_LOGS');
  });

  it.each([
    ['/ai-governance', ['VIEW_GOVERNANCE']],
    ['/security', ['VIEW_AI_SECURITY']],
    ['/regulatory', ['VIEW_REGULATORY']],
    ['/equity', ['VIEW_EQUITY_METRICS']],
    ['/human-review', ['VIEW_REVIEW_QUEUE']],
    ['/governance/privacy', ['VIEW_PRIVACY_CENTER']],
    ['/integrations', ['VIEW_INTEGRATIONS']],
    ['/system-health', ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY']],
    ['/governance/clinical', ['VIEW_GOVERNANCE']],
    ['/governance/clinical/policies', ['MANAGE_CLINICAL_POLICY']],
    ['/governance/ai-security', ['VIEW_AI_SECURITY']],
    ['/governance/ai-security/incidents', ['REVIEW_AI_SECURITY_INCIDENTS']],
    ['/governance/regulatory', ['VIEW_REGULATORY']],
    ['/governance/regulatory/capabilities', ['VIEW_REGULATORY']],
    ['/governance/regulatory/evidence', ['APPROVE_REGULATORY']],
    ['/governance/equity', ['VIEW_EQUITY_METRICS']],
    ['/governance/equity/metrics', ['VIEW_EQUITY_METRICS']],
    ['/governance/equity/cohorts', ['MANAGE_EQUITY_COHORTS']],
    ['/governance/equity/reports', ['EXPORT_EQUITY_REPORTS']],
    ['/governance/validation', ['VIEW_VALIDATION']],
    ['/governance/validation/scenarios', ['MANAGE_VALIDATION']],
    ['/governance/validation/runs', ['RUN_VALIDATION']],
    ['/governance/validation/release-gates', ['APPROVE_VALIDATION']],
    ['/review', ['VIEW_REVIEW_QUEUE']],
    ['/patients/:patientId/review', ['READ_PHI', 'VIEW_REVIEW_QUEUE']],
    ['/audit', ['VIEW_AUDIT_LOGS']],
    ['/audit/phi', ['VIEW_PHI_AUDIT']],
    ['/audit/integrations', ['VIEW_AUDIT_LOGS']],
    ['/audit/policy', ['VIEW_AUDIT_LOGS']],
    ['/operations/observability', ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY']],
    ['/operations/deployments', ['VIEW_OPERATIONS']],
    ['/operations/service-health', ['VIEW_OPERATIONS']],
  ])('%s has the expected P0 platform permissions', (path, permissions) => {
    const block = routeBlock(path);

    expect(block).toContain(`path: '${path}'`);
    for (const permission of permissions) {
      expect(block).toContain(`Permission.${permission}`);
    }
  });

  it('keeps App route preflight aligned with canonical inventory permission policies', () => {
    const clinicalIntelligenceRecords = getFrontendVisibleToolInventory().filter(
      (record) =>
        record.executorStatus === TOOL_EXECUTOR_STATUS.PLATFORM &&
        record.endpoint?.startsWith('/api/clinical-intelligence/')
    );

    expect(clinicalIntelligenceRecords.length).toBeGreaterThan(0);

    for (const record of clinicalIntelligenceRecords) {
      const block = routeBlock(record.route);

      expect(block, `${record.id} route block`).toContain(`path: '${record.route}'`);
      expect(record.permissionPolicy, `${record.id} permission policy`).toBeTruthy();
      for (const permission of record.permissionPolicy.permissions) {
        expect(block, `${record.id} missing ${permission}`).toContain(`Permission.${permission}`);
      }
      if (
        record.permissionPolicy.logic === TOOL_PERMISSION_LOGIC.ALL &&
        record.permissionPolicy.permissions.length > 1
      ) {
        expect(block, `${record.id} should require all permissions`).toContain(
          'requireAllPermissions: true'
        );
      }
    }
  });
});
