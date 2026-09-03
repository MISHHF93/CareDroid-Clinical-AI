import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { globSync } from 'glob';
import { fixJsxMedicalThemeAttributes } from './normalize-medical-jsx-fix.mjs';

const root = process.cwd();
const files = globSync('src/**/*.{css,tsx,jsx}', {
  cwd: root,
  absolute: true,
  ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
});

const cssTextMap = [
  [/color:\s*#9ca3af\b/gi, 'color: var(--medical-text-subtle, #9ca3af)'],
  [/color:\s*#6b7280\b/gi, 'color: var(--medical-text-muted, #6b7280)'],
  [/color:\s*#111827\b/gi, 'color: var(--medical-text-heading, #111827)'],
  [/color:\s*#d1d5db\b/gi, 'color: var(--medical-text-disabled, #d1d5db)'],
  [/color:\s*#f8fafc\b/gi, 'color: var(--medical-text-heading, #111827)'],
  [/color:\s*#e2e8f0\b/gi, 'color: var(--medical-text-muted, #6b7280)'],
  [/color:\s*#cbd5e1\b/gi, 'color: var(--medical-text-muted, #6b7280)'],
  [/color:\s*#94a3b8\b/gi, 'color: var(--medical-text-subtle, #9ca3af)'],
  [/color:\s*#bfdbfe\b/gi, 'color: var(--medical-text-link, #0ea5e9)'],
  [/color:\s*#dbeafe\b/gi, 'color: var(--medical-text-link, #0ea5e9)'],
  [/color:\s*#a7f3d0\b/gi, 'color: var(--medical-status-success-text, #15803d)'],
  [/color:\s*#86efac\b/gi, 'color: var(--medical-status-success-text, #15803d)'],
  [/color:\s*#fca5a5\b/gi, 'color: var(--medical-status-critical-text, #b91c1c)'],
  [/color:\s*#fdba74\b/gi, 'color: var(--medical-status-high-text, #c2410c)'],
  [/color:\s*#fcd34d\b/gi, 'color: var(--medical-status-warning-text, #b45309)'],
  [/color:\s*#fde68a\b/gi, 'color: var(--medical-status-warning-text, #b45309)'],
  [/color:\s*#38bdf8\b/gi, 'color: var(--medical-text-link, #0ea5e9)'],
  [/color:\s*#00b4ff\b/gi, 'color: var(--medical-text-link, #0ea5e9)'],
  [/color:\s*#fff\b/gi, 'color: var(--medical-text-on-solid, #ffffff)'],
  [/color:\s*#ffffff\b/gi, 'color: var(--medical-text-on-solid, #ffffff)'],
];

const cssSurfaceMap = [
  [
    /background:\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\)/g,
    'background: var(--medical-surface-card, #ffffff)',
  ],
  [
    /background:\s*linear-gradient\(180deg,\s*rgba\(15,\s*23,\s*42,\s*[\d.]+\),\s*rgba\(17,\s*24,\s*39,\s*[\d.]+\)\)/g,
    'background: linear-gradient(180deg, var(--medical-surface-card, #ffffff), var(--medical-surface-page, #f0f9ff))',
  ],
  [
    /background:\s*rgba\(17,\s*24,\s*39,\s*[\d.]+\)/g,
    'background: var(--medical-surface-card, #ffffff)',
  ],
  [
    /border:\s*1px solid rgba\(148,\s*163,\s*184,\s*[\d.]+\)/g,
    'border: 1px solid var(--medical-border, #e0f2fe)',
  ],
];

const tsxColorMap = [
  ["'#9CA3AF'", 'MEDICAL_THEME.inkSubtle'],
  ['"#9CA3AF"', 'MEDICAL_THEME.inkSubtle'],
  ["'#9ca3af'", 'MEDICAL_THEME.inkSubtle'],
  ["'#6B7280'", 'MEDICAL_THEME.inkMuted'],
  ['"#6B7280"', 'MEDICAL_THEME.inkMuted'],
  ["'#D1D5DB'", 'MEDICAL_THEME.inkDisabled'],
  ['"#D1D5DB"', 'MEDICAL_THEME.inkDisabled'],
  ["'#111827'", 'MEDICAL_THEME.ink'],
  ['"#111827"', 'MEDICAL_THEME.ink'],
  ["'#0ea5e9'", 'MEDICAL_THEME.accent'],
  ['"#0ea5e9"', 'MEDICAL_THEME.accent'],
  ["'#F8FAFC'", 'MEDICAL_THEME.ink'],
  ['"#F8FAFC"', 'MEDICAL_THEME.ink'],
  ["'#E2E8F0'", 'MEDICAL_THEME.inkMuted'],
  ["'#CBD5E1'", 'MEDICAL_THEME.inkMuted'],
  ["'#94A3B8'", 'MEDICAL_THEME.inkSubtle'],
  ["'#FCA5A5'", 'MEDICAL_TYPE.statusCritical'],
  ["'#ffffff'", 'MEDICAL_THEME.surfaceCard'],
  ['"#ffffff"', 'MEDICAL_THEME.surfaceCard'],
  ["'#F9FAFB'", 'MEDICAL_THEME.ink'],
  ['"#F9FAFB"', 'MEDICAL_THEME.ink'],
  ["'#BFDBFE'", 'MEDICAL_THEME.accent'],
  ['"#BFDBFE"', 'MEDICAL_THEME.accent'],
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

  return `${importLine}${source}`;
}

let touched = 0;
for (const file of files) {
  if (file.includes('medicalTheme.constants')) continue;

  let next = readFileSync(file, 'utf8');
  const original = next;

  if (file.endsWith('.css')) {
    for (const [pattern, value] of cssTextMap) {
      next = next.replace(pattern, value);
    }
    for (const [pattern, value] of cssSurfaceMap) {
      next = next.replace(pattern, value);
    }
  } else {
    for (const [from, to] of tsxColorMap) {
      next = next.replaceAll(from, to);
    }
    if (next.includes('MEDICAL_THEME.') || next.includes('MEDICAL_TYPE.')) {
      next = ensureMedicalImport(next, file);
      next = fixJsxMedicalThemeAttributes(next);
    }
  }

  if (next !== original) {
    writeFileSync(file, next);
    touched += 1;
  }
}

console.log(`Normalized medical text in ${touched} files`);
