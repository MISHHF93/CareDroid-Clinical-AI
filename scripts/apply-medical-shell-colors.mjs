import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.css', { cwd: process.cwd(), absolute: true });
const replacements = [
  [/background:\s*#0d1117\b/gi, 'background: var(--app-surface-1, #ffffff)'],
  [/background:\s*#0D1117\b/g, 'background: var(--app-surface-1, #ffffff)'],
  [/background:\s*#0B1120\b/g, 'background: var(--medical-surface-page, #f0f9ff)'],
  [/background:\s*#0b1120\b/g, 'background: var(--medical-surface-page, #f0f9ff)'],
  [/background:\s*#0f172a\b/gi, 'background: var(--medical-surface-page, #f0f9ff)'],
  [/background:\s*#020617\b/g, 'background: var(--medical-surface-page, #f0f9ff)'],
  [/background:\s*#1c2333\b/gi, 'background: var(--app-surface-muted, #f0f9ff)'],
  [/background:\s*rgba\(15,\s*23,\s*42,\s*0\.94\)/g, 'background: rgba(255, 255, 255, 0.94)'],
  [/color:\s*#f9fafb\b/g, 'color: var(--medical-ink, #111827)'],
  [/#0d1117\b/g, 'var(--app-surface-1, #ffffff)'],
];

let touched = 0;
for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let next = original;
  for (const [pattern, value] of replacements) {
    next = next.replace(pattern, value);
  }
  if (next !== original) {
    writeFileSync(file, next);
    touched += 1;
  }
}

console.log(`Updated ${touched} shell CSS files`);
