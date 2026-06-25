/**
 * Full-scale CareDroid medical theme normalization.
 * Orchestrates color/text sweeps and applies surface + accent fixes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { globSync } from 'glob';
import {
  fixBrokenAppShellIsSelectors,
  fixJsxMedicalThemeAttributes,
} from './normalize-medical-jsx-fix.mjs';

const root = process.cwd();

const cssFiles = globSync('src/**/*.{css}', {
  cwd: root,
  absolute: true,
  ignore: ['**/node_modules/**'],
});

const codeFiles = globSync('src/**/*.{tsx,jsx,js}', {
  cwd: root,
  absolute: true,
  ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
});

const cssReplacements = [
  [/rgba\(15,\s*23,\s*42,\s*0\.94\)/gi, 'var(--medical-surface-card, #ffffff)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.92\)/gi, 'var(--medical-surface-card, #ffffff)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.9\)/gi, 'var(--medical-surface-card, #ffffff)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.82\)/gi, 'var(--medical-surface-card, #ffffff)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.78\)/gi, 'var(--medical-surface-page, #f0f9ff)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.55\)/gi, 'var(--medical-surface-page, #f0f9ff)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.08\)/gi, 'var(--medical-surface-page, #f0f9ff)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.04\)/gi, 'var(--medical-surface-page, #f0f9ff)'],
  [/rgba\(30,\s*41,\s*59,\s*0\.92\)/gi, 'var(--medical-surface-card, #ffffff)'],
  [/rgba\(30,\s*41,\s*59,\s*0\.9\)/gi, 'var(--medical-surface-card, #ffffff)'],
  [/rgba\(30,\s*41,\s*59,\s*0\.8\)/gi, 'var(--medical-surface-card, #ffffff)'],
  [/rgba\(30,\s*41,\s*59,\s*0\.72\)/gi, 'var(--medical-surface-card, #ffffff)'],
  [/rgba\(30,\s*41,\s*59,\s*0\.45\)/gi, 'var(--medical-surface-page, #f0f9ff)'],
  [/rgba\(2,\s*6,\s*23,\s*0\.55\)/gi, 'var(--medical-surface-page, #f0f9ff)'],
  [
    /linear-gradient\(135deg,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\),\s*rgba\(30,\s*41,\s*59,\s*[\d.]+\)\)/gi,
    'linear-gradient(135deg, var(--medical-surface-card, #ffffff), var(--medical-surface-page, #f0f9ff))',
  ],
  [
    /linear-gradient\(180deg,\s*rgba\(127,\s*29,\s*29,\s*[\d.]+\),\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'linear-gradient(180deg, rgba(254, 242, 242, 0.9), var(--medical-surface-card, #ffffff))',
  ],
  [
    /linear-gradient\(180deg,\s*rgba\(69,\s*10,\s*10,\s*[\d.]+\),\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'linear-gradient(180deg, rgba(254, 242, 242, 0.85), var(--medical-surface-card, #ffffff))',
  ],
  [/rgba\(15,\s*23,\s*42,\s*0\.12\)/gi, 'rgba(14, 165, 233, 0.08)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.07\)/gi, 'rgba(14, 165, 233, 0.06)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.06\)/gi, 'rgba(14, 165, 233, 0.05)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.25\)/gi, 'rgba(14, 165, 233, 0.12)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.22\)/gi, 'rgba(14, 165, 233, 0.1)'],
  [/#2563eb\b/gi, '#0ea5e9'],
  [/#2563EB\b/g, '#0ea5e9'],
  [/#3b82f6\b/gi, '#0ea5e9'],
  [/#1d4ed8\b/gi, '#0284c7'],
  [/#60a5fa\b/gi, '#38bdf8'],
  [/var\(--color-accent,\s*#a78bfa\)/g, 'var(--medical-accent-soft, #38bdf8)'],
  [/var\(--ed-text-primary,\s*var\(--color-text-primary,\s*var\(--medical-ink,\s*var\(--app-surface-1,\s*#ffffff\)\)\)\)/g,
    'var(--ed-text-primary, var(--color-text-primary, var(--medical-ink, #111827)))'],
  [/var\(--nai-surface,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'var(--nai-surface, var(--medical-surface-card, #ffffff))'],
  [/var\(--nai-surface-elevated,\s*rgba\(30,\s*41,\s*59,\s*[\d.]+\)\)/gi,
    'var(--nai-surface-elevated, var(--medical-surface-card, #ffffff))'],
  [/var\(--app-surface-card,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'var(--app-surface-card, var(--medical-surface-card, #ffffff))'],
  [/var\(--surface-elevated,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'var(--surface-elevated, var(--medical-surface-card, #ffffff))'],
  [/var\(--app-surface-muted,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'var(--app-surface-muted, var(--medical-surface-page, #f0f9ff))'],
  [/var\(--app-surface,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'var(--app-surface, var(--medical-surface-page, #f0f9ff))'],
  [/var\(--app-code-bg,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'var(--app-code-bg, var(--medical-surface-page, #f0f9ff))'],
  [/var\(--app-surface-2,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'var(--app-surface-2, var(--medical-surface-page, #f0f9ff))'],
  [
    /linear-gradient\(180deg,\s*rgba\(127,\s*29,\s*29,\s*[\d.]+\),\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)\)/gi,
    'linear-gradient(180deg, rgba(254, 242, 242, 0.85), var(--medical-surface-card, #ffffff))',
  ],
  [
    /linear-gradient\(135deg,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\),\s*rgba\(37,\s*99,\s*235,\s*[\d.]+\)\)/gi,
    'linear-gradient(135deg, var(--medical-surface-page, #f0f9ff), rgba(14, 165, 233, 0.08))',
  ],
  [/rgba\(15,\s*23,\s*42,\s*0\.12\)/gi, 'rgba(14, 165, 233, 0.08)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.08\)/gi, 'rgba(14, 165, 233, 0.06)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.06\)/gi, 'rgba(14, 165, 233, 0.05)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.25\)/gi, 'rgba(14, 165, 233, 0.12)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.04\)/gi, 'var(--medical-surface-page, #f0f9ff)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.9\)/gi, 'var(--medical-surface-card, #ffffff)'],
];

const tsxReplacements = [
  ["'#2563EB'", 'MEDICAL_THEME.accent'],
  ['"#2563EB"', 'MEDICAL_THEME.accent'],
  ["'#2563eb'", 'MEDICAL_THEME.accent'],
  ["'#0D1117'", 'MEDICAL_THEME.surfaceCard'],
  ["'#0d1117'", 'MEDICAL_THEME.surfaceCard'],
  ["'#0A0E1A'", 'MEDICAL_THEME.surfacePage'],
  ["'#0a0e1a'", 'MEDICAL_THEME.surfacePage'],
  ["'#0B1120'", 'MEDICAL_THEME.surfacePage'],
  ["'#0b1120'", 'MEDICAL_THEME.surfacePage'],
  ["'#0f172a'", 'MEDICAL_THEME.surfacePage'],
  ["'#111827'", 'MEDICAL_THEME.ink'],
  ["background: MEDICAL_THEME.ink", 'background: MEDICAL_THEME.surfaceCard'],
];

function medicalImportPath(file) {
  const fromDir = dirname(file);
  const target = `${root}/src/config/medicalTheme.constants`;
  let rel = relative(fromDir, target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function ensureMedicalImport(source, file) {
  if (source.includes('medicalTheme.constants')) return source;
  const importPath = medicalImportPath(file);
  const needsType = source.includes('MEDICAL_TYPE.');
  const importLine = needsType
    ? `import { MEDICAL_THEME, MEDICAL_TYPE } from '${importPath}';\n`
    : `import { MEDICAL_THEME } from '${importPath}';\n`;

  const reactImport = source.match(/^import .+ from ['"]react['"];?\n/m);
  if (reactImport) {
    const idx = source.indexOf(reactImport[0]) + reactImport[0].length;
    return `${source.slice(0, idx)}${importLine}${source.slice(idx)}`;
  }
  const firstImport = source.match(/^import .+;\n/m);
  if (firstImport) {
    const idx = source.indexOf(firstImport[0]) + firstImport[0].length;
    return `${source.slice(0, idx)}${importLine}${source.slice(idx)}`;
  }
  return `${importLine}${source}`;
}

let cssTouched = 0;
for (const file of cssFiles) {
  const original = readFileSync(file, 'utf8');
  let next = original;
  for (const [pattern, value] of cssReplacements) {
    next = next.replace(pattern, value);
  }
  next = fixBrokenAppShellIsSelectors(next);
  if (next !== original) {
    writeFileSync(file, next);
    cssTouched += 1;
  }
}

let codeTouched = 0;
for (const file of codeFiles) {
  if (file.includes('medicalTheme.constants')) continue;
  const original = readFileSync(file, 'utf8');
  let next = original;
  for (const [from, to] of tsxReplacements) {
    next = next.replaceAll(from, to);
  }
  next = next.replace(/#2563eb/gi, '#0ea5e9');
  if (next.includes('MEDICAL_THEME.') || next.includes('MEDICAL_TYPE.')) {
    next = ensureMedicalImport(next, file);
    next = fixJsxMedicalThemeAttributes(next);
  }
  if (next !== original) {
    writeFileSync(file, next);
    codeTouched += 1;
  }
}

console.log(`Full-scale medical normalization: ${cssTouched} CSS, ${codeTouched} code files`);