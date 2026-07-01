import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = JSON.parse(readFileSync(join(root, 'qa/dashboard-resize-audit/dashboard-resize-report.json'), 'utf8'));

const byTarget = {};
const byVp = {};
const topOffenders = {};
const uniquePerTarget = {};

for (const x of r.results) {
  byTarget[x.id] ??= { pass: 0, fail: 0 };
  byVp[x.viewport.id] ??= { pass: 0, fail: 0 };
  if (x.overflow?.pass) {
    byTarget[x.id].pass++;
    byVp[x.viewport.id].pass++;
  } else {
    byTarget[x.id].fail++;
    byVp[x.viewport.id].fail++;
    uniquePerTarget[x.id] ??= new Set();
    for (const o of x.overflow?.offenders ?? []) {
      topOffenders[o.selector] = (topOffenders[o.selector] ?? 0) + 1;
      uniquePerTarget[x.id].add(o.selector);
    }
  }
}

console.log('=== BY DASHBOARD (fail/total viewports) ===');
for (const [id, s] of Object.entries(byTarget).sort((a, b) => b[1].fail - a[1].fail)) {
  console.log(`${id}: ${s.fail}/6 fail`);
}

console.log('\n=== BY VIEWPORT (fail/total dashboards) ===');
for (const [id, s] of Object.entries(byVp)) {
  console.log(`${id}: ${s.fail}/10 fail`);
}

console.log('\n=== TOP OFFENDER SELECTORS ===');
for (const [sel, n] of Object.entries(topOffenders).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`${n}x  ${sel}`);
}

console.log('\n=== UNIQUE OFFENDERS PER DASHBOARD ===');
for (const [id, set] of Object.entries(uniquePerTarget)) {
  console.log(`\n${id}:`);
  for (const sel of [...set].slice(0, 6)) console.log(`  - ${sel}`);
}