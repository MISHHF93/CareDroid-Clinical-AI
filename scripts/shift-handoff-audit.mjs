/**
 * Shift handoff readability audit for nurse/physician role changes.
 * Run: node scripts/shift-handoff-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditShiftHandoffSurfaces } from '../src/components/whiteboard/shiftHandoffReadabilityAudit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'shift-handoff-audit-report.json');

const roles = ['physician', 'charge_nurse', 'triage_nurse', 'ed_manager'];

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'New clinician understands waiting, high-risk, EMS, reassess, and boarders within 60 seconds',
  signals: ['Waiting', 'High risk', 'EMS inbound', 'Reassess due', 'Boarders'],
  roles: Object.fromEntries(
    roles.map((roleId) => [
      roleId,
      auditShiftHandoffSurfaces(roleId, { operationalLoadElevated: true }),
    ]),
  ),
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('\nShift handoff readability audit\n');
for (const roleId of roles) {
  const entry = report.roles[roleId];
  console.log(
    `${roleId}: before ${entry.before.passes60SecondTest ? 'PASS' : 'FAIL'} (${entry.before.visibleCount}/5 visible) → after ${entry.after.passes60SecondTest ? 'PASS' : 'FAIL'}`,
  );
  if (!entry.before.passes60SecondTest) {
    console.log(`  missing before fix: ${entry.before.missing.join(', ') || 'none'}`);
  }
}
console.log(`\nReport: ${reportPath}`);
