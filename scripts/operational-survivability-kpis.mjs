/**
 * Measure the three pilot survivability KPIs.
 * Run: node scripts/operational-survivability-kpis.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateOperationalSurvivabilityKpis } from '../src/config/operationalSurvivabilityKpisModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'operational-survivability-kpis-report.json');

const evaluation = evaluateOperationalSurvivabilityKpis();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Reception <60s · Charge nurse <30s · Director throughput <2min',
  ...evaluation,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('\nOperational survivability KPIs\n');
console.log(
  `1. Reception walk-in registration: ${evaluation.kpis.reception.expressWalkInSeconds}s (target ${evaluation.kpis.reception.targetSeconds}s) — ${evaluation.kpis.reception.passes ? 'PASS' : 'FAIL'}`,
);
console.log(
  `2. Charge nurse department status: ~${evaluation.kpis.chargeNurse.estimatedReadSeconds}s (target ${evaluation.kpis.chargeNurse.targetSeconds}s) — ${evaluation.kpis.chargeNurse.passes ? 'PASS' : 'FAIL'}`,
);
console.log(
  `3. Director throughput read: ~${evaluation.kpis.director.estimatedReadSeconds}s (target ${evaluation.kpis.director.targetSeconds}s) — ${evaluation.kpis.director.passes ? 'PASS' : 'FAIL'}`,
);
console.log(
  `\nPilot ready (${evaluation.passedCount}/${evaluation.totalCount}): ${evaluation.pilotReady ? 'YES' : 'NO'}`,
);
console.log(`Report: ${reportPath}`);
