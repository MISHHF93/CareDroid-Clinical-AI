/**
 * Card contrast normalization — fixes paired bg/fg mismatches on card surfaces.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.{css,tsx,jsx}', {
  cwd: process.cwd(),
  absolute: true,
  ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
});

const replacements = [
  [/color-mix\([^)]*#0[fF]172[aA][^)]*\)/g, 'var(--medical-card-bg, #ffffff)'],
  [
    /background:\s*color-mix\(in srgb, var\(--color-card[^)]+\)\s*96%,\s*#0[fF]172[aA]\)/gi,
    'background: var(--medical-card-bg, #ffffff)',
  ],
  [
    /background:\s*color-mix\(in srgb, var\(--color-card[^)]+\)\s*94%,\s*#0[fF]172[aA]\)/gi,
    'background: var(--medical-card-bg, #ffffff)',
  ],
  [/var\(--app-surface,\s*#101827\)/gi, 'var(--medical-card-bg, #ffffff)'],
  [/var\(--app-text-strong,\s*#f8fafc\)/gi, 'var(--medical-card-fg, #111827)'],
  [/var\(--color-text-primary,\s*#f8fafc\)/gi, 'var(--medical-card-fg, #111827)'],
  [/var\(--color-text-primary,\s*#0[fF]172[aA]\)/gi, 'var(--medical-card-fg, #111827)'],
  [/var\(--app-fg,\s*#0[fF]172[aA]\)/gi, 'var(--medical-card-fg, #111827)'],
  [/var\(--nai-text,\s*#f8fafc\)/gi, 'var(--nai-text, var(--medical-card-fg, #111827))'],
  [/var\(--color-surface-raised,\s*#f8fafc\)/gi, 'var(--medical-card-muted-bg, #f0f9ff)'],
  [
    /linear-gradient\([^)]*#0[fF]172[aA][^)]*\)/gi,
    'linear-gradient(135deg, var(--medical-surface-page, #f0f9ff), var(--medical-card-bg, #ffffff))',
  ],
  ["'#94a3b8'", 'MEDICAL_THEME.inkSubtle'],
  ['"#94a3b8"', 'MEDICAL_THEME.inkSubtle'],
  [/color:\s*#0[fF]172[aA]\b/gi, 'color: var(--medical-card-fg, #111827)'],
  [/color:\s*#f8fafc\b/gi, 'color: var(--medical-card-fg, #111827)'],
];

let touched = 0;
for (const file of files) {
  if (file.includes('medicalTheme.constants')) continue;
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

console.log(`Normalized card contrast in ${touched} files`);
