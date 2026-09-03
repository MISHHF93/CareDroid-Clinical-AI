/**
 * Simulate registration-clerk throughput at 100 patients/day.
 * Run: node scripts/reception-throughput-simulation.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareReceptionProfiles,
  simulateReceptionDay,
} from '../src/services/receptionThroughputModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'reception-throughput-report.json');

const PATIENTS_PER_DAY = Number(process.env.RECEPTION_SIM_PATIENTS || 100);

function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function main() {
  const baseline = simulateReceptionDay({ profile: 'baseline', patientCount: PATIENTS_PER_DAY });
  const harmonized = simulateReceptionDay({
    profile: 'harmonized',
    patientCount: PATIENTS_PER_DAY,
  });
  const comparison = compareReceptionProfiles(PATIENTS_PER_DAY);

  const report = {
    generatedAt: new Date().toISOString(),
    patientsPerDay: PATIENTS_PER_DAY,
    mix: harmonized.mix,
    baseline: {
      averages: baseline.averages,
      dayTotals: baseline.dayTotals,
    },
    harmonized: {
      averages: harmonized.averages,
      dayTotals: harmonized.dayTotals,
      byWorkflow: harmonized.byWorkflow,
    },
    improvement: comparison.delta,
    optimizations: comparison.optimizations,
    workflowsUsed: [
      'ExpressRegistration (express-register)',
      'QuickIntake reception variant (quick-create)',
      'ReceptionSmartIntakeOverlay + SmartIntake (smart-intake)',
      'completeReceptionHandoff → ensureEncounterAfterIntake + enterTriageQueue',
      'convertEmsArrivalForReception (ems)',
      'completeProvisionalIntake (unknown)',
    ],
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\nReception throughput simulation — ${PATIENTS_PER_DAY} patients/day\n`);
  console.log('Metric                    | Baseline   | Harmonized | Delta');
  console.log('--------------------------|------------|------------|-------');
  console.log(
    `Clicks / registration     | ${String(baseline.averages.clicksPerRegistration).padEnd(10)} | ${String(harmonized.averages.clicksPerRegistration).padEnd(10)} | -${comparison.delta.clicksPerRegistration}`,
  );
  console.log(
    `Screens / registration    | ${String(baseline.averages.screensVisited).padEnd(10)} | ${String(harmonized.averages.screensVisited).padEnd(10)} | -${comparison.delta.screensVisited}`,
  );
  console.log(
    `Time to create patient    | ${formatMs(baseline.averages.timeToCreatePatientMs).padEnd(10)} | ${formatMs(harmonized.averages.timeToCreatePatientMs).padEnd(10)} |`,
  );
  console.log(
    `Time to create encounter  | ${formatMs(baseline.averages.timeToCreateEncounterMs).padEnd(10)} | ${formatMs(harmonized.averages.timeToCreateEncounterMs).padEnd(10)} | automated`,
  );
  console.log(
    `Time to assign queue      | ${formatMs(baseline.averages.timeToAssignQueueMs).padEnd(10)} | ${formatMs(harmonized.averages.timeToAssignQueueMs).padEnd(10)} | automated`,
  );
  console.log(
    `Avg registration time     | ${baseline.averages.totalRegistrationMinutes}min`.padEnd(26) +
      ` | ${harmonized.averages.totalRegistrationMinutes}min`.padEnd(11) +
      ` | -${comparison.delta.totalRegistrationMinutes}min`,
  );
  console.log(
    `\nDay totals: ${comparison.delta.dayClicksSaved} fewer clicks, ${comparison.delta.dayMinutesSaved} fewer registration minutes`,
  );
  console.log(`\nReport: ${reportPath}`);
}

main();
