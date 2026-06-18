/**
 * Five-minute training rule audit for Reception Workspace.
 * Run: node scripts/reception-training-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditReceptionTrainingReadiness } from '../src/config/receptionTrainingAuditModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'reception-training-audit-report.json');

const audit = auditReceptionTrainingReadiness();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'New receptionist understands primary workflows within five minutes',
  passesAudit: audit.passesAudit,
  copy: audit.copy,
  workflows: audit.workflows,
  recommendation: audit.recommendation,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('\nReception training audit (five-minute rule)\n');
console.log(`Plain language copy: ${audit.copy.usesPlainLanguage ? 'PASS' : 'FAIL'}`);
console.log(`Workflow training: ${audit.workflows.passesAudit ? 'PASS' : 'FAIL'}`);
for (const workflow of audit.workflows.workflows) {
  console.log(
    `  ${workflow.label}: ${workflow.estimatedSeconds}s · ${workflow.passesFiveMinuteRule ? 'OK' : 'NEEDS SIMPLIFICATION'}`,
  );
}
console.log(`\nReport: ${reportPath}`);
