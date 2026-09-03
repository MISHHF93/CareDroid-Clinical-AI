import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';

const root = process.cwd();
const files = globSync('src/**/*.css', { cwd: root, absolute: true });

const replacements = [
  /* Do not replace #111827 — it is canonical medical ink for text. */
  [/#0b1220\b/g, 'var(--medical-surface-page, #f0f9ff)'],
  [/#0a0e1a\b/g, 'var(--medical-surface-page, #f0f9ff)'],
  [/#0b1120\b/g, 'var(--medical-surface-page, #f0f9ff)'],
  [/#1f2937\b/g, 'var(--medical-border, #e0f2fe)'],
  [/#1e293b\b/g, 'var(--app-surface-elevated, #ffffff)'],
  [/#172033\b/g, 'var(--app-surface-2, #ffffff)'],
  [/#2d3748\b/g, 'var(--medical-border, #e0f2fe)'],
  [/var\(--app-accent, #00ff88\)/g, 'var(--app-accent-interactive)'],
  [/var\(--accent-color, #00ff88\)/g, 'var(--app-accent-interactive)'],
  [/var\(--accent-green, #00ff88\)/g, 'var(--app-accent-interactive)'],
  [/var\(--primary-color, #4f46e5\)/g, 'var(--app-accent-interactive)'],
  [/#00ff88\b/g, 'var(--app-accent-interactive)'],
  [/#14b8a6\b/g, 'var(--app-accent-2)'],
  [/#4f46e5\b/g, 'var(--app-accent-interactive)'],
  [
    /linear-gradient\(135deg, #0f172a 0%, #111827 100%\)/g,
    'linear-gradient(135deg, var(--medical-surface-page, #f0f9ff) 0%, var(--app-surface-1, #ffffff) 100%)',
  ],
  [
    /linear-gradient\(90deg, var\(--app-accent-interactive\), #14b8a6\)/g,
    'linear-gradient(90deg, var(--app-accent-interactive), var(--app-accent-2))',
  ],
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

console.log(`Updated ${touched} CSS files with medical fallbacks`);
