/**
 * Platform theme sweep — legacy accents, contrast fallbacks, and card text fixes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.{css,tsx,jsx,js}', {
  cwd: process.cwd(),
  absolute: true,
  ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
});

const replacements = [
  [/linear-gradient\(135deg,\s*#4[Ff]46[Ee]5\s*0%,\s*#7[Cc]3[Aa][Ee][Dd]\s*100%\)/gi,
    'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'],
  [/linear-gradient\(135deg,\s*#2196[Ff]3,\s*#1976[Dd]2\)/gi,
    'linear-gradient(135deg, #0ea5e9, #0284c7)'],
  [/linear-gradient\(135deg,\s*#ff6b6b,\s*#ff8a80\)/gi,
    'linear-gradient(135deg, #ef4444, #dc2626)'],
  [/background:\s*#4[Cc][Aa][Ff]50\b/gi, 'background: #22c55e'],
  [/background-color:\s*var\(--primary-color,\s*#4[Ff]46[Ee]5\)/gi,
    'background-color: var(--app-accent-interactive, #0ea5e9)'],
  [/border-color:\s*rgba\(79,\s*70,\s*229/gi,
    'border-color: rgba(14, 165, 233'],
  [/background:\s*rgba\(79,\s*70,\s*229/gi, 'background: rgba(14, 165, 233'],
  [/background:\s*#1a1a1a\b/gi, 'background: var(--medical-surface-card, #ffffff)'],
  [/var\(--color-border-subtle,\s*#334155\)/gi, 'var(--medical-border, #e0f2fe)'],
  [/var\(--color-text-secondary,\s*#cbd5e1\)/gi, 'var(--medical-text-muted, #6b7280)'],
  [/var\(--color-text-secondary,\s*#94a3b8\)/gi, 'var(--medical-text-muted, #6b7280)'],
  [/var\(--color-text-muted,\s*#94a3b8\)/gi, 'var(--medical-text-subtle, #9ca3af)'],
  [/color:\s*var\(--color-text-primary,\s*#e2e8f0\)/gi,
    'color: var(--medical-text-body, #111827)'],
  [/var\(--border,\s*#e2e8f0\)/gi, 'var(--medical-border, #e0f2fe)'],
  [/background:\s*rgba\(30,\s*41,\s*59,\s*0\.9\)/gi,
    'background: var(--medical-card-muted-bg, #f0f9ff)'],
  [/background:\s*rgba\(59,\s*130,\s*246,\s*0\.2\)/gi,
    'background: var(--medical-accent-tint, rgba(14, 165, 233, 0.12))'],
  [/background:\s*#FF6B9D\b/gi, 'background: var(--app-accent-interactive, #0ea5e9)'],
  [/box-shadow:\s*0 4px 12px rgba\(33,\s*150,\s*243/gi,
    'box-shadow: 0 4px 12px rgba(14, 165, 233'],
  [/box-shadow:\s*0 6px 16px rgba\(33,\s*150,\s*243/gi,
    'box-shadow: 0 6px 16px rgba(14, 165, 233'],
  [/linear-gradient\(180deg,\s*#4[Ff]46[Ee]5\s*0%,\s*#7[Cc]3[Aa][Ee][Dd]\s*100%\)/gi,
    'linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%)'],
  [/var\(--primary-color,\s*#4[Ff]46[Ee]5\)/gi, 'var(--app-accent-interactive, #0ea5e9)'],
  [/var\(--text-primary,\s*#e0f2fe\)/gi, 'var(--medical-text-body, #111827)'],
  [/background-color:\s*var\(--medical-ink,\s*#111827\)/gi,
    'background-color: var(--medical-surface-card, #ffffff)'],
  [/#2196[Ff]3\b/g, '#0ea5e9'],
  [/#1976[Dd]2\b/g, '#0284c7'],
  [/#334155\b/g, 'var(--medical-border, #e0f2fe)'],
  [/#cbd5e1\b/g, 'var(--medical-text-muted, #6b7280)'],
  [/var\(--color-border,\s*#cbd5e1\)/gi, 'var(--medical-border, #e0f2fe)'],
  [/var\(--color-border-subtle,\s*#334155\)/gi, 'var(--medical-border, #e0f2fe)'],
  ["'#FF6B9D'", "'#0ea5e9'"],
  ['"#FF6B9D"', '"#0ea5e9"'],
  ["'#7C3AED'", "'#38bdf8'"],
  ['"#7C3AED"', '"#38bdf8"'],
  ["'#4F46E5'", "'#0284c7'"],
  ['"#4F46E5"', '"#0284c7"'],
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

console.log(`Platform theme sweep updated ${touched} files`);