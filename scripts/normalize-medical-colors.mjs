import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';

const root = process.cwd();
const files = globSync('src/**/*.{css,tsx,jsx,js}', {
  cwd: root,
  absolute: true,
  ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
});

const replacements = [
  [/#374151\b/gi, '#e0f2fe'],
  [/#1[Ff]2937\b/g, '#e0f2fe'],
  [/#0[Bb]1120\b/g, '#ffffff'],
  [/#111827\b/g, '#111827'], // keep ink — no-op guard
  [/#172033\b/gi, '#f0f9ff'],
  [/#1[Cc]2333\b/g, '#f0f9ff'],
  [/#020617\b/g, '#f0f9ff'],
  [/#60[Aa]5[Ff][Aa]\b/g, '#0ea5e9'],
  [/#3[Bb]82[Ff]6\b/g, '#0ea5e9'],
  [/#1[Dd]4[Ee][Dd]8\b/g, '#0284c7'],
  [/#1[Dd]4[Ee][Dd]81[Ff]\b/g, 'rgba(14, 165, 233, 0.12)'],
  [/#93[Cc]5[Ff][Dd]\b/g, '#38bdf8'],
  [/#764ba2\b/gi, '#38bdf8'],
  [/var\(--color-border-subtle,\s*#374151\)/g, 'var(--medical-border, #e0f2fe)'],
  [/var\(--color-floating-surface,\s*#0f172a\)/g, 'var(--medical-surface-card, #ffffff)'],
  [/color-mix\([^)]*#0f172a[^)]*\)/g, 'var(--medical-surface-page, #f0f9ff)'],
];

let touched = 0;
for (const file of files) {
  if (file.includes('medicalTheme.constants')) continue;
  const original = readFileSync(file, 'utf8');
  let next = original;
  for (const [pattern, value] of replacements) {
    next = next.replace(pattern, value);
  }

  // Light surfaces should not use white text except on solid accent buttons.
  next = next.replace(/color:\s*['"]#F9FAFB['"]/gi, "color: 'var(--medical-ink, #111827)'");
  next = next.replace(/color:\s*#F9FAFB\b/gi, 'color: var(--medical-ink, #111827)');

  if (file.endsWith('.css')) {
    next = next.replace(
      /(background:\s*var\(--(?:app-surface|medical-surface)[^;]+;[\s\S]{0,120}?)color:\s*#F9FAFB/gi,
      '$1color: var(--medical-ink, #111827)',
    );
  }

  if (next !== original) {
    writeFileSync(file, next);
    touched += 1;
  }
}

console.log(`Normalized colors in ${touched} files`);