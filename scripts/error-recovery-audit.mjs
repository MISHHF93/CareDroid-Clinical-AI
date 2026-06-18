/**
 * Error recovery audit — API, validation, network, and sync recovery.
 * Run: node scripts/error-recovery-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditErrorRecoverySurfaces,
  ERROR_RECOVERY_SURFACE_REGISTRY,
} from '../src/config/errorRecoveryModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'error-recovery-audit-report.json');

const audit = auditErrorRecoverySurfaces();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Recover from API, validation, network, and sync failures without losing workflow context',
  pattern: 'Preserve form/state + inline alert + retry; never close intake on API failure',
  surfaces: ERROR_RECOVERY_SURFACE_REGISTRY,
  audit,
  fixes: [
    'QuickIntake / ExpressRegistration keep form open on API failure',
    'NewPatientIntake aborts handoff on vertical-slice failure',
    'receptionHandoff surfaces sync errors on patient record',
    'ReceptionWorkspace + whiteboard + EMS show retry banners',
    'SmartIntake distinguishes match API errors from empty results',
    'emergencyStore preserves ui.error on backend init failure',
  ],
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Error recovery audit written to ${reportPath}`);
console.log(`Recovery surfaces: ${audit.completeCount}/${audit.surfaceCount}`);
if (!audit.passesAudit) process.exitCode = 1;
