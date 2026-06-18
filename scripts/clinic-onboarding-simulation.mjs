/**
 * Clinic onboarding simulation — staff, queues, thresholds, alerts, roles.
 * Run: node scripts/clinic-onboarding-simulation.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditClinicOnboardingExposure,
  buildClinicOnboardingDefaults,
  simulateClinicOnboarding,
} from '../src/config/clinicOnboardingModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'clinic-onboarding-simulation-report.json');

const beforeFixes = simulateClinicOnboarding({
  provisioned: false,
  orgScopedThresholdSave: false,
  orgScopedAlertSave: false,
  storeHydration: false,
});

const afterFixes = simulateClinicOnboarding({
  provisioned: true,
  orgScopedThresholdSave: true,
  orgScopedAlertSave: true,
  storeHydration: true,
});

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Simulate onboarding a new clinic — configure staff, queues, thresholds, alerts, roles',
  clinicDefaults: buildClinicOnboardingDefaults(),
  exposure: auditClinicOnboardingExposure(),
  beforeFixes: {
    summary: beforeFixes.summary,
    frictionPoints: beforeFixes.frictionPoints,
    steps: beforeFixes.steps,
  },
  afterFixes: {
    summary: afterFixes.summary,
    frictionPoints: afterFixes.frictionPoints,
    steps: afterFixes.steps,
    mitigationsApplied: [
      'Seed settings.emergencyOs during tenant provisioning',
      'Save Emergency Settings to organization tenant-admin',
      'Hydrate emergencyStore from organization engine',
      'Deep-merge emergencyOs on tenant-admin PATCH',
      'Expose emergencyOs on tenant-admin GET',
      'Fix TenantAdministrationCenter save ReferenceError on users',
    ],
  },
  remainingFriction: afterFixes.frictionPoints,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Clinic onboarding simulation written to', reportPath);
console.log(
  `Before fixes: ${beforeFixes.summary.completeSteps}/${beforeFixes.summary.totalSteps} complete, friction ${beforeFixes.summary.totalFriction}`,
);
console.log(
  `After fixes: ${afterFixes.summary.completeSteps}/${afterFixes.summary.totalSteps} complete, friction ${afterFixes.summary.totalFriction}`,
);
