/**
 * Production-readiness audit — scores, risks, quick wins, deployment blockers.
 * Run: node scripts/production-readiness-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditProductionReadiness,
  auditProductionReadinessExposure,
} from '../src/config/productionReadinessModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'production-readiness-audit-report.json');

const afterFixes = auditProductionReadiness({
  emergencyApiAuthenticated: true,
  orgScopedSettings: true,
  storeHydration: true,
  clinicProvisioned: true,
  edRbacWired: true,
  orgScopedEmergencySettingsService: true,
});

const beforeFixes = auditProductionReadiness({
  emergencyApiAuthenticated: false,
  orgScopedSettings: false,
  storeHydration: false,
  clinicProvisioned: false,
  edRbacWired: false,
});

const exposure = auditProductionReadinessExposure();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Score architecture, frontend, backend, responsiveness, integrations, security, auditability, operational awareness, pilot readiness',
  exposure,
  beforeFixes: {
    scores: beforeFixes.scores,
    summary: beforeFixes.summary,
    pilotRecommendation: beforeFixes.pilotRecommendation,
  },
  afterFixes: {
    scores: afterFixes.scores,
    summary: afterFixes.summary,
    pilotRecommendation: afterFixes.pilotRecommendation,
    mitigationsApplied: [
      'JWT AuthGuard on EmergencyOsController',
      'resolveEmergencyRoleId wired via useEmergencyRolePermissions',
      'Org-scoped emergencyOs save/load via tenant-admin',
      'Provisioning seeds settings.emergencyOs',
      'OrganizationContext hydrates emergencyStore',
      'EmergencySettingsService scoped by organizationId',
      'permissionsOverrides merged in hasEmergencyActionPermission',
    ],
  },
  dimensions: afterFixes.scores.dimensions,
  topRisks: afterFixes.topRisks,
  topQuickWins: afterFixes.topQuickWins,
  topDeploymentBlockers: afterFixes.topDeploymentBlockers,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Production readiness audit written to', reportPath);
console.log(`Overall: ${afterFixes.scores.overall}/100 (${afterFixes.scores.grade})`);
for (const [key, dim] of Object.entries(afterFixes.scores.dimensions)) {
  console.log(`  ${key}: ${dim.score} (${dim.grade})`);
}
console.log(
  `Risks ${afterFixes.summary.riskCount} · Quick wins ${afterFixes.summary.quickWinCount} · Blockers ${afterFixes.summary.blockerCount}`,
);
console.log(`Passes production audit: ${afterFixes.summary.passesProductionAudit}`);
