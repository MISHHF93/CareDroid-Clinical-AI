/**
 * Platform Intelligence audit — Prompts 117–136.
 * Run: node scripts/platform-intelligence-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditPlatformIntelligence } from '../src/config/platformIntelligenceModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'platform-intelligence-audit-report.json');

const audit = auditPlatformIntelligence();
const { assessment } = audit;

const convergence = assessment.modules.find((m) => m.id === 'platform_convergence');

const report = {
  generatedAt: new Date().toISOString(),
  goal: audit.goal,
  promptsCovered: audit.promptsCovered,
  overallScore: assessment.overallScore,
  overallStatus: assessment.overallStatus,
  summary: assessment.summary,
  moduleScores: audit.moduleScores,
  convergence: {
    score: convergence?.assessment.score,
    gaps: convergence?.assessment.artifacts.gaps,
    correctiveActions: convergence?.assessment.artifacts.correctiveActions,
  },
  modules: assessment.modules.map((module) => ({
    prompt: module.prompt,
    id: module.id,
    label: module.label,
    score: module.assessment.score,
    status: module.assessment.status,
    kpisPassed: module.assessment.passedKpis,
    kpisTotal: module.assessment.totalKpis,
  })),
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Platform intelligence audit written to', reportPath);
console.log(`Overall: ${assessment.overallScore}/100 (${assessment.overallStatus})`);
console.log(`Modules ready: ${assessment.summary.readyModules}/${assessment.summary.moduleCount}`);
console.log(`KPIs: ${assessment.summary.kpisPassed}/${assessment.summary.kpisTotal}`);
console.log(`Convergence actions: ${assessment.summary.convergenceActions?.length ?? 0}`);
