/**
 * Whiteboard stress simulation — operational awareness under load.
 * Run: node scripts/whiteboard-stress-simulation.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WHITEBOARD_STRESS_SCENARIO,
  simulateWhiteboardStressScenario,
} from '../src/components/whiteboard/whiteboardOperationalLoadModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'whiteboard-stress-report.json');

const report = simulateWhiteboardStressScenario(WHITEBOARD_STRESS_SCENARIO);
report.generatedAt = new Date().toISOString();
report.readability = {
  beforeMitigations: report.beforeReadability,
  afterMitigations: report.afterReadability,
  issues: report.evaluation.issues,
  primaryFocus: report.evaluation.primaryFocus,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('\nWhiteboard stress simulation\n');
console.log(
  `Scenario: ${report.scenario.waitingPatients} waiting · ${report.scenario.emsArrivals} EMS · ${report.scenario.reassessmentsDue} reassess · ${report.scenario.referralsPending} referrals pending`,
);
console.log(`Load level: ${report.evaluation.loadLevel} (score ${report.evaluation.overloadScore})`);
console.log(`Readability before mitigations: ${report.beforeReadability}/100`);
console.log(`Readability after mitigations: ${report.afterReadability}/100`);
console.log('\nPrimary focus order:');
for (const focus of report.evaluation.primaryFocus) {
  console.log(`  - ${focus.label}: ${focus.value}`);
}
console.log('\nIssues:');
for (const issue of report.evaluation.issues) {
  console.log(`  [${issue.severity}] ${issue.summary}`);
}
console.log(`\nReport: ${reportPath}`);
