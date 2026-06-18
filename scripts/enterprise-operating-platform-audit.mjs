/**
 * Enterprise Operating Platform audit — Prompts 99–116.
 * Run: node scripts/enterprise-operating-platform-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditEnterpriseOperatingPlatform } from '../src/config/enterpriseOperatingPlatformModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'enterprise-operating-platform-audit-report.json');

const audit = auditEnterpriseOperatingPlatform();
const { assessment } = audit;

const report = {
  generatedAt: new Date().toISOString(),
  goal: audit.goal,
  promptsCovered: audit.promptsCovered,
  overallScore: assessment.overallScore,
  overallStatus: assessment.overallStatus,
  summary: assessment.summary,
  moduleScores: audit.moduleScores,
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

console.log('Enterprise operating platform audit written to', reportPath);
console.log(`Overall: ${assessment.overallScore}/100 (${assessment.overallStatus})`);
console.log(`Modules ready: ${assessment.summary.readyModules}/${assessment.summary.moduleCount}`);
console.log(`KPIs: ${assessment.summary.kpisPassed}/${assessment.summary.kpisTotal}`);
for (const module of assessment.modules) {
  console.log(`  P${module.prompt} ${module.label}: ${module.assessment.score} (${module.assessment.status})`);
}
