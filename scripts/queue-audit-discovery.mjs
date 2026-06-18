/**
 * Queue audit discovery — length, longest wait, bottlenecks, overdue.
 * Run: node scripts/queue-audit-discovery.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditAllQueues,
  auditQueueExposure,
  summarizeQueueAudit,
} from '../src/config/queueAuditModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'queue-audit-discovery-report.json');

const now = Date.now();
const samplePatients = [
  {
    id: 'qa-1',
    firstName: 'Long',
    lastName: 'Wait',
    mrn: 'ED-901',
    state: 'Triage',
    arrivalTime: new Date(now - 55 * 60 * 1000).toISOString(),
    flags: [],
  },
  {
    id: 'qa-2',
    firstName: 'Verify',
    lastName: 'Pending',
    mrn: 'ED-902',
    state: 'Registration',
    arrivalTime: new Date(now - 25 * 60 * 1000).toISOString(),
    flags: [],
  },
  {
    id: 'qa-3',
    firstName: 'Reassess',
    lastName: 'Due',
    mrn: 'ED-903',
    state: 'Assessment',
    arrivalTime: new Date(now - 70 * 60 * 1000).toISOString(),
    flags: ['ReassessmentDue'],
  },
];

const rows = auditAllQueues({ patients: samplePatients, emsInbound: 2, referrals: [] });
const summary = summarizeQueueAudit(rows);
const audit = auditQueueExposure();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Audit all queues and expose length, longest wait, bottlenecks, and overdue items',
  metrics: ['length', 'longestWait', 'bottleneck', 'overdue'],
  summary,
  queues: rows.map((row) => ({
    id: row.id,
    label: row.label,
    domain: row.domain,
    length: row.length,
    longestWaitMinutes: row.longestWaitMinutes,
    overdueCount: row.overdueCount,
    isBottleneck: row.isBottleneck,
    bottleneckReason: row.bottleneckReason,
  })),
  surfaces: audit,
  recommendations: audit.passesAudit
    ? []
    : ['Wire queue audit metrics to reception, whiteboard, and queue intelligence surfaces'],
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Queue audit discovery written to ${reportPath}`);
console.log(
  `Queues: ${summary.activeQueueCount} active · ${summary.totalOverdue} overdue · longest ${summary.longestWaitLabel}`,
);
if (!audit.passesAudit) {
  process.exitCode = 1;
}
