/**
 * Customer Success Platform audit — KPIs and capability scoring artifact.
 * Run: node scripts/customer-success-platform-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditCustomerSuccessPlatform } from '../src/config/customerSuccessPlatformModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'customer-success-platform-audit-report.json');

const audit = auditCustomerSuccessPlatform();
const { assessment } = audit;

const report = {
  generatedAt: new Date().toISOString(),
  goal: audit.goal,
  summary: assessment.summary,
  kpiEvaluation: assessment.kpiEvaluation,
  capabilities: {
    onboardingPercent: assessment.capabilities.onboarding.percent,
    adoptionScore: assessment.capabilities.adoption.adoptionScore,
    featureUtilizationRate: assessment.capabilities.feature_utilization.utilizationRate,
    healthScore: assessment.capabilities.health_score.score,
    openSupportItems: assessment.capabilities.support_tracking.openCount,
    renewalReadiness: assessment.capabilities.renewal_readiness.score,
  },
  kpiTargets: audit.kpiTargets,
  featureRegistryCount: audit.featureRegistryCount,
  supportOpenItems: assessment.capabilities.support_tracking.openItems,
  renewalFactors: assessment.capabilities.renewal_readiness.factors,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Customer success platform audit written to', reportPath);
console.log(`Health: ${assessment.summary.healthScore} · Renewal: ${assessment.summary.renewalReadiness}`);
console.log(
  `KPIs ${assessment.kpiEvaluation.passedCount}/${assessment.kpiEvaluation.totalCount} · Onboarding ${assessment.summary.onboardingPercent}%`,
);
console.log(
  `Adoption ${assessment.summary.adoptionScore}% · Utilization ${assessment.summary.featureUtilizationRate}% · Support open ${assessment.summary.openSupportItems}`,
);
