/**
 * Empty state discovery audit — no blank containers without guidance.
 * Run: node scripts/empty-state-discovery.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditEmptyStateSurfaces,
  EMPTY_STATE_SURFACE_REGISTRY,
} from '../src/config/emptyStateRegistry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'empty-state-discovery-report.json');

const audit = auditEmptyStateSurfaces();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Replace blank areas with guidance, actions, status, and next steps',
  pattern: 'OperationalEmptyState + EMPTY_STATE_COPY',
  surfaces: EMPTY_STATE_SURFACE_REGISTRY,
  audit,
  receptionSearchFix: 'ArrivalDashboard uses full patient list — search no longer empties queues',
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Empty state discovery written to ${reportPath}`);
console.log(`Surfaces with structured empty states: ${audit.completeCount}/${audit.surfaceCount}`);
if (!audit.passesAudit) {
  console.warn('Incomplete:', audit.incompleteSurfaces.join(', '));
  process.exitCode = 1;
}
