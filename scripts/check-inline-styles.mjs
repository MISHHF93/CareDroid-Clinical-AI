#!/usr/bin/env node
/**
 * CI gate — fails when inline style usage exceeds the approved baseline.
 * Run after visual cleanup waves to ratchet counts down over time.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const SRC = join(ROOT, 'src');

/** Approved total inline style count across src/ (ratchet down as cleanup proceeds). */
const BASELINE_TOTAL = 690;

/** Per-file ceilings for previously cleaned surfaces — regressions fail the gate. */
const FILE_CEILINGS = new Map([
  ['src/pages/Settings.jsx', 0],
  ['src/pages/Profile.jsx', 1],
  ['src/pages/commercial/CommercialPages.jsx', 0],
  ['src/pages/ProfileSettings.jsx', 0],
  ['src/pages/admin/EdStaffWorkflowAdmin.jsx', 0],
  ['src/components/AppShell.tsx', 0],
  ['src/components/Header.tsx', 1],
]);

const ALLOW_DYNAMIC = new Set([
  'src/pages/Profile.jsx',
  'src/components/Header.tsx',
]);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(path, acc);
      continue;
    }
    acc.push(path);
  }
  return acc;
}

const files = walk(SRC).filter((file) => /\.(tsx|ts|jsx|js)$/.test(file));
const offenders = [];
let total = 0;

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const text = readFileSync(file, 'utf8');
  const count = (text.match(/style=\{\{/g) || []).length;
  if (!count) continue;
  total += count;
  const ceiling = FILE_CEILINGS.get(rel);
  if (ceiling != null && count > ceiling) {
    offenders.push({ rel, count, ceiling, reason: 'file ceiling exceeded' });
  }
}

const failures = [...offenders];

if (total > BASELINE_TOTAL) {
  failures.push({
    rel: '(total)',
    count: total,
    ceiling: BASELINE_TOTAL,
    reason: 'repository baseline exceeded',
  });
}

if (failures.length) {
  console.error('# Inline style gate failed\n');
  for (const row of failures) {
    console.error(`- ${row.rel}: ${row.count} (max ${row.ceiling}) — ${row.reason}`);
  }
  console.error(`\nTotal inline styles: ${total} (baseline ${BASELINE_TOTAL})`);
  process.exit(1);
}

console.log(`Inline style gate passed (${total}/${BASELINE_TOTAL}, ${FILE_CEILINGS.size} file ceilings enforced).`);