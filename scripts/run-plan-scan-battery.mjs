import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const suites = [
  ['test:alias-sync'],
  ['test:catalog-launch'],
  ['test:registry-launch'],
  ['test:executor-mapping'],
  ['test:contract-matrix'],
  ['test:backend-exposure'],
  ['test:e2e-matrix'],
  ['test:tool-render-smoke'],
  ['test:safety-compliance'],
  ['test:visibility-matrix'],
];

const startedAt = new Date();
const results = [];

for (const [script] of suites) {
  const cmd = `npm run ${script}`;
  const run = spawnSync('npm', ['run', script], {
    encoding: 'utf8',
    shell: true,
  });
  results.push({
    script,
    command: cmd,
    status: run.status === 0 ? 'pass' : 'fail',
    exitCode: run.status ?? -1,
    stdout: run.stdout || '',
    stderr: run.stderr || '',
  });
}

const passed = results.filter((r) => r.status === 'pass').length;
const failed = results.length - passed;

const lines = [];
lines.push('# Plan Scan Battery Report');
lines.push('');
lines.push(`Started: ${startedAt.toISOString()}`);
lines.push(`Completed: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Suites run: ${results.length}`);
lines.push(`- Passed: ${passed}`);
lines.push(`- Failed: ${failed}`);
lines.push('');
lines.push('## Suite Results');
lines.push('');
for (const r of results) {
  lines.push(`### ${r.script} — ${r.status.toUpperCase()} (exit ${r.exitCode})`);
  lines.push('');
  lines.push(`Command: \`${r.command}\``);
  lines.push('');
  const excerpt = `${r.stdout}\n${r.stderr}`.trim().split('\n').slice(-30).join('\n');
  lines.push('```text');
  lines.push(excerpt || '(no output)');
  lines.push('```');
  lines.push('');
}

writeFileSync('docs/plan-scan-battery-report.md', `${lines.join('\n')}\n`, 'utf8');
console.log('Wrote docs/plan-scan-battery-report.md');

const failedSuites = results.filter((r) => r.status === 'fail').map((r) => r.script);
if (failedSuites.length > 0) {
  console.error(`Failed suites: ${failedSuites.join(', ')}`);
  process.exit(1);
}
