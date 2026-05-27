import { readFileSync, writeFileSync } from 'node:fs';

const backlog = readFileSync('docs/plan-implementation-backlog.md', 'utf8');
const battery = readFileSync('docs/plan-scan-battery-report.md', 'utf8');

const totalTasks = (backlog.match(/^- \[ \]/gm) || []).length;
const completedTasks = (backlog.match(/^- \[x\]/gim) || []).length;
const pendingTasks = totalTasks - completedTasks;

const summaryMatch = battery.match(/- Suites run: (\d+)\n- Passed: (\d+)\n- Failed: (\d+)/m);
const suitesRun = summaryMatch ? Number(summaryMatch[1]) : 0;
const suitesPassed = summaryMatch ? Number(summaryMatch[2]) : 0;
const suitesFailed = summaryMatch ? Number(summaryMatch[3]) : 0;

const generatedAt = new Date().toISOString();

const lines = [
  '# Plan Progress Dashboard',
  '',
  `Generated: ${generatedAt}`,
  '',
  '## Backlog Progress',
  '',
  `- Total plan checklist items: ${totalTasks}`,
  `- Completed checklist items: ${completedTasks}`,
  `- Pending checklist items: ${pendingTasks}`,
  '',
  '## Validation Battery Health',
  '',
  `- Suites run: ${suitesRun}`,
  `- Suites passed: ${suitesPassed}`,
  `- Suites failed: ${suitesFailed}`,
  '',
  '## Interpretation',
  '',
  '- A green battery validates encoded plan-contract execution lanes.',
  '- Pending checklist items indicate roadmap phases still represented as backlog work, not complete implementation guarantees.',
  '',
  '## Source Artifacts',
  '',
  '- `docs/plan-implementation-backlog.md`',
  '- `docs/plan-scan-battery-report.md`',
  '',
];

writeFileSync('docs/plan-progress-dashboard.md', lines.join('\n'));
console.log('Wrote docs/plan-progress-dashboard.md');
