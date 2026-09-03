/**
 * Operational audit discovery — expose workflow history for patient, queue, reassessment, referral.
 * Run: node scripts/operational-audit-discovery.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OPERATIONAL_AUDIT_DOMAIN,
  OPERATIONAL_AUDIT_SURFACE_REGISTRY,
  auditOperationalHistoryExposure,
  classifyWorkflowLog,
  summarizeOperationalHistory,
} from '../src/config/operationalAuditModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'operational-audit-discovery-report.json');

const sampleLogs = [
  {
    id: 'sample-patient',
    type: 'patient_created',
    title: 'Patient created',
    summary: 'Walk-in registered.',
    timestamp: '2026-06-17T10:00:00.000Z',
    patientId: 'p-1',
    source: 'reception-workspace',
  },
  {
    id: 'sample-queue',
    type: 'journey_state_changed',
    title: 'Journey state changed',
    summary: 'Moved to Waiting.',
    timestamp: '2026-06-17T10:05:00.000Z',
    patientId: 'p-1',
    source: 'queue-assignment',
    metadata: { queue: 'pretriage', targetState: 'Waiting' },
  },
  {
    id: 'sample-reassessment',
    type: 'reassessment_completed',
    title: 'Reassessment completed',
    summary: 'Reminder completed.',
    timestamp: '2026-06-17T10:20:00.000Z',
    patientId: 'p-1',
    source: 'reassessment-workflow',
  },
  {
    id: 'sample-referral',
    type: 'referral_status_changed',
    title: 'Referral status changed',
    summary: 'Cardiology referral moved to Acknowledged.',
    timestamp: '2026-06-17T10:30:00.000Z',
    patientId: 'p-1',
    source: 'referral-workflow',
    metadata: { status: 'Acknowledged' },
  },
];

const classified = sampleLogs.map((log) => ({
  id: log.id,
  domain: classifyWorkflowLog(log),
}));

const domainCoverage = Object.values(OPERATIONAL_AUDIT_DOMAIN).map((domain) => ({
  domain,
  sampleCount: classified.filter((entry) => entry.domain === domain).length,
}));

const audit = auditOperationalHistoryExposure();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Expose operational history for patient actions, queue changes, reassessments, and referrals',
  domains: Object.values(OPERATIONAL_AUDIT_DOMAIN),
  surfaces: OPERATIONAL_AUDIT_SURFACE_REGISTRY,
  domainCoverage,
  summary: summarizeOperationalHistory(sampleLogs),
  audit,
  recommendations: audit.passesAudit ? [] : ['Wire operational history to all required surfaces'],
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Operational audit discovery written to ${reportPath}`);
console.log(`Surfaces: ${audit.surfaceCount}; domains: ${audit.domains.length}`);
if (!audit.passesAudit) {
  process.exitCode = 1;
}
