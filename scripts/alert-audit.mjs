/**
 * Emergency OS alert audit — classification and noise triage report.
 * Run: node scripts/alert-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALERT_SOURCE_REGISTRY,
  auditAlertInventory,
  classifyOperationalAlert,
} from '../src/engine/alertClassificationModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'alert-audit-report.json');

const sampleAlerts = [
  {
    id: 'alert-ems-critical-1',
    severity: 'Critical',
    type: 'EMS',
    title: 'Critical EMS inbound',
    message: 'Unit 12',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-capacity-yellow',
    severity: 'Info',
    type: 'Capacity',
    title: 'Capacity degradation detected',
    message: 'Yellow band',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-referral-sent-1',
    severity: 'Info',
    type: 'Referral',
    title: 'Referral sent to Cardiology',
    message: 'Routine',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-reassessment-reminder-upcoming-r1',
    severity: 'Warning',
    type: 'Reassessment',
    title: 'Recheck due in 2min - Jane Doe',
    message: 'Chest pain',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-long-wait-warning-p1',
    severity: 'Warning',
    type: 'Reassessment',
    title: 'Wait time approaching limit',
    message: '45m waiting',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-referral-unacknowledged-1',
    severity: 'Warning',
    type: 'Referral',
    title: 'Referral unacknowledged',
    message: '20m',
    createdAt: new Date().toISOString(),
  },
];

const classified = sampleAlerts.map((alert) => ({
  id: alert.id,
  title: alert.title,
  tier: classifyOperationalAlert(alert),
}));

const audit = auditAlertInventory(sampleAlerts);

const report = {
  generatedAt: new Date().toISOString(),
  taxonomy: ['critical', 'high', 'medium', 'informational'],
  registryCount: ALERT_SOURCE_REGISTRY.length,
  registry: ALERT_SOURCE_REGISTRY.map((entry) => ({
    id: entry.id,
    domain: entry.domain,
    defaultTier: entry.defaultTier,
    suppressGlobal: Boolean(entry.suppressGlobal),
    surfaces: entry.surfaces,
  })),
  sampleClassification: classified,
  triage: audit,
  noiseReduced: audit.suppressedIds,
  importantRetained: audit.visibleCount,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('\nEmergency OS alert audit\n');
console.log(`Registry: ${report.registryCount} alert sources`);
console.log('Sample classification:');
for (const entry of classified) {
  console.log(`  [${entry.tier}] ${entry.title}`);
}
console.log(`\nTriage: ${audit.inputCount} in → ${audit.visibleCount} visible · ${audit.suppressedCount} suppressed`);
console.log(`Report: ${reportPath}`);
