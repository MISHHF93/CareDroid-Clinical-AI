/**
 * Platform scorecard aggregator.
 * Run: node scripts/platform-scorecard.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { createJiti } = require('jiti');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'platform-scorecard-report.json');
const jiti = createJiti(join(root, '_platform-scorecard.cjs'));

const { auditCustomerSuccessPlatform } = jiti('./src/config/customerSuccessPlatformModel.ts');
const { auditEnterpriseOperatingPlatform } = jiti('./src/config/enterpriseOperatingPlatformModel.ts');
const { auditPlatformIntelligence } = jiti('./src/config/platformIntelligenceModel.ts');
const { auditProductionReadiness } = jiti('./src/config/productionReadinessModel.ts');
const { auditTrackMindMaturity } = jiti('./src/config/trackMindMaturityModel.ts');

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
}

function statusFromScore(score) {
  if (score >= 85) return 'excellent';
  if (score >= 75) return 'strong';
  if (score >= 65) return 'developing';
  if (score >= 50) return 'watch';
  return 'at-risk';
}

function percent(part, whole) {
  return whole > 0 ? clampScore((part / whole) * 100) : 0;
}

function weightedAverage(sections) {
  const weightTotal = sections.reduce((sum, section) => sum + section.weight, 0);
  return clampScore(
    sections.reduce((sum, section) => sum + section.score * section.weight, 0) / weightTotal,
  );
}

function lowestModules(modules, limit = 5) {
  return [...modules]
    .sort((a, b) => a.assessment.score - b.assessment.score)
    .slice(0, limit)
    .map((module) => ({
      id: module.id,
      prompt: module.prompt,
      label: module.label,
      score: module.assessment.score,
      status: module.assessment.status,
      kpisPassed: module.assessment.passedKpis,
      kpisTotal: module.assessment.totalKpis,
    }));
}

function buildOpportunity({ id, area, label, score, target = 80, weight, source }) {
  return {
    id,
    area,
    label,
    score,
    target,
    gap: Math.max(0, target - score),
    impact: clampScore(Math.max(0, target - score) * weight),
    source,
  };
}

const sharedSignals = {
  emergencyApiAuthenticated: true,
  orgScopedSettings: true,
  storeHydration: true,
  edRbacWired: true,
  orgScopedEmergencySettingsService: true,
};

const customer = auditCustomerSuccessPlatform();
const enterprise = auditEnterpriseOperatingPlatform({ signals: sharedSignals });
const platform = auditPlatformIntelligence({ signals: sharedSignals });
const maturity = auditTrackMindMaturity(sharedSignals);
const production = auditProductionReadiness({
  ...sharedSignals,
  viteApiUrlConfigured: true,
  productionSecretsConfigured: true,
});

const customerSummary = customer.assessment.summary;
const customerKpiRate = percent(customerSummary.kpisPassed, customerSummary.kpisTotal);
const customerScore = clampScore(
  customerSummary.healthScore * 0.25 +
    customerSummary.renewalReadiness * 0.25 +
    customerSummary.featureUtilizationRate * 0.25 +
    customerKpiRate * 0.25,
);

const sections = [
  {
    id: 'platform-intelligence',
    label: 'Platform Intelligence',
    score: platform.assessment.overallScore,
    status: platform.assessment.overallStatus,
    weight: 35,
    source: 'auditPlatformIntelligence',
  },
  {
    id: 'enterprise-operating-platform',
    label: 'Enterprise Operating Platform',
    score: enterprise.assessment.overallScore,
    status: enterprise.assessment.overallStatus,
    weight: 25,
    source: 'auditEnterpriseOperatingPlatform',
  },
  {
    id: 'customer-success',
    label: 'Customer Success',
    score: customerScore,
    status: statusFromScore(customerScore),
    weight: 20,
    source: 'auditCustomerSuccessPlatform',
  },
  {
    id: 'operating-maturity',
    label: 'Operating Maturity',
    score: maturity.scores.overall,
    status: maturity.scores.levelId,
    weight: 10,
    source: 'auditTrackMindMaturity',
  },
  {
    id: 'production-readiness',
    label: 'Production Readiness',
    score: production.scores.overall,
    status: production.scores.grade,
    weight: 10,
    source: 'auditProductionReadiness',
  },
];

const opportunities = [
  ...lowestModules(platform.assessment.modules, 8).map((module) =>
    buildOpportunity({
      id: `platform:${module.id}`,
      area: 'platform-intelligence',
      label: module.label,
      score: module.score,
      weight: 0.35,
      source: 'platformIntelligenceModel',
    }),
  ),
  ...lowestModules(enterprise.assessment.modules, 8).map((module) =>
    buildOpportunity({
      id: `enterprise:${module.id}`,
      area: 'enterprise-operating-platform',
      label: module.label,
      score: module.score,
      weight: 0.25,
      source: 'enterpriseOperatingPlatformModel',
    }),
  ),
  buildOpportunity({
    id: 'customer:feature-utilization',
    area: 'customer-success',
    label: 'Feature utilization breadth',
    score: customerSummary.featureUtilizationRate,
    weight: 0.2,
    source: 'customerSuccessPlatformModel',
  }),
  buildOpportunity({
    id: 'production:overall',
    area: 'production-readiness',
    label: 'Production readiness',
    score: production.scores.overall,
    weight: 0.1,
    source: 'productionReadinessModel',
  }),
]
  .filter((opportunity) => opportunity.gap > 0)
  .sort((a, b) => b.impact - a.impact || b.gap - a.gap)
  .slice(0, 12);

const overallScore = weightedAverage(sections);

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'CareDroid platform scorecard across intelligence, enterprise readiness, customer success, maturity, and production readiness',
  overallScore,
  overallStatus: statusFromScore(overallScore),
  sections,
  summary: {
    platformScore: platform.assessment.overallScore,
    enterpriseScore: enterprise.assessment.overallScore,
    customerScore,
    customerFeatureUtilizationRate: customerSummary.featureUtilizationRate,
    customerKpisPassed: customerSummary.kpisPassed,
    customerKpisTotal: customerSummary.kpisTotal,
    maturityScore: maturity.scores.overall,
    productionReadinessScore: production.scores.overall,
    productionReadinessGrade: production.scores.grade,
  },
  lowestModules: {
    platform: lowestModules(platform.assessment.modules),
    enterprise: lowestModules(enterprise.assessment.modules),
  },
  opportunities,
  sourceReports: {
    platform: {
      goal: platform.goal,
      promptsCovered: platform.promptsCovered,
      moduleScores: platform.moduleScores,
    },
    enterprise: {
      goal: enterprise.goal,
      promptsCovered: enterprise.promptsCovered,
      moduleScores: enterprise.moduleScores,
    },
    customer: {
      goal: customer.goal,
      kpiEvaluation: customer.assessment.kpiEvaluation,
      supportOpenItems: customer.assessment.capabilities.support_tracking.openItems,
    },
    maturity: {
      goal: maturity.goal,
      dimensions: maturity.scores.dimensions,
      prioritizedImprovements: maturity.prioritizedImprovements,
    },
    production: {
      grade: production.scores.grade,
      summary: production.summary,
    },
  },
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Platform scorecard written to', reportPath);
console.log(`Overall: ${overallScore}/100 (${report.overallStatus})`);
for (const section of sections) {
  console.log(`  ${section.label}: ${section.score}/100 (${section.status})`);
}
console.log('Top opportunities:');
for (const opportunity of opportunities.slice(0, 5)) {
  console.log(`  ${opportunity.label}: ${opportunity.score}/${opportunity.target} (gap ${opportunity.gap})`);
}
