/**
 * Smart Intake audit — clicks, transitions, verification friction.
 * Run: node scripts/smart-intake-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SMART_INTAKE_STREAMLINED_STEPS,
  auditSmartIntakeFlow,
  measureSmartIntakePath,
} from '../src/config/smartIntakeFlowModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'smart-intake-audit-report.json');

const audit = auditSmartIntakeFlow();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Reduce Smart Intake time while preserving identity validation',
  metrics: ['clicks', 'screen transitions', 'verification friction'],
  streamlinedSteps: SMART_INTAKE_STREAMLINED_STEPS,
  baselinePath: measureSmartIntakePath({ path: 'baseline' }),
  optimizedPath: measureSmartIntakePath({
    path: 'optimized',
    usesBulkApprove: true,
    skipsIntro: true,
    skipsOcrTransition: true,
    usesContinueButton: true,
  }),
  audit,
  optimizations: [
    'Autostart skips intro and opens capture directly',
    'Continue advances capture → match → verify → finalize',
    'Document upload jumps to match (skips OCR-only screen)',
    'Bulk approve only exact extracted/existing matches',
    'Queue verify opens directly on field review',
  ],
  validationPreserved: [
    'Conflicting fields still require individual staff review',
    'Finalize still requires verificationComplete',
    'Link/create actions unchanged',
    'Duplicate match selection still required',
  ],
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Smart Intake audit written to ${reportPath}`);
console.log(
  `Clicks ${audit.baseline.clicks} → ${audit.optimized.clicks} (−${audit.clickReduction})`,
);
console.log(
  `Friction ${audit.baseline.frictionScore} → ${audit.optimized.frictionScore} (−${audit.frictionReduction})`,
);
if (!audit.passesAudit) {
  process.exitCode = 1;
}
