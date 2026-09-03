/**
 * Multi-tenant readiness audit — settings, branding, thresholds, integrations, roles.
 * Run: node scripts/multi-tenant-readiness-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditMultiTenantExposure,
  auditMultiTenantReadiness,
} from '../src/config/multiTenantReadinessModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'multi-tenant-readiness-audit-report.json');

const audit = auditMultiTenantReadiness();
const exposure = auditMultiTenantExposure();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Verify settings, branding, thresholds, integrations, and roles can be configured per organization',
  passesAudit: audit.passesAudit,
  overallReadinessScore: audit.overallReadinessScore,
  conclusion: audit.conclusion,
  domainVerdict: audit.summary,
  evaluation: {
    totals: audit.evaluation.totals,
    domains: audit.evaluation.domains,
    isolationGaps: audit.evaluation.isolationGaps,
    mitigations: audit.evaluation.mitigations,
  },
  tenantInfrastructure: exposure.tenantInfrastructure,
  orgSettingsShape: exposure.orgSettingsShape,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Multi-tenant readiness audit written to', reportPath);
console.log(`Score: ${audit.overallReadinessScore}/100 · Passes: ${audit.passesAudit}`);
for (const [domain, verdict] of Object.entries(audit.summary)) {
  const status = verdict.canConfigurePerOrganization
    ? 'READY'
    : verdict.partiallyConfigured
      ? 'PARTIAL'
      : 'NOT READY';
  console.log(
    `  ${domain}: ${status} (${verdict.readySurfaces}/${verdict.totalSurfaces} surfaces)`,
  );
}
