import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');

const tokenFiles = [
  'styles/medical-color-layer.css',
  'styles/medical-type-layer.css',
  'styles/theme-tokens.css',
  'styles/emergency-tokens.css',
  'styles/color-normalization.css',
  'styles/text-normalization.css',
  'styles/surface-normalization.css',
  'styles/medical-card-layer.css',
  'styles/card-contrast-normalization.css',
  'config/theme.tokens.js',
  'config/medicalTheme.constants.ts',
  'main.jsx',
].map((file) => readFileSync(join(srcRoot, file), 'utf8'));

const cssBundle = globSync('src/**/*.css', {
  cwd: join(srcRoot, '..'),
  absolute: true,
  ignore: ['**/*.test.*'],
})
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const codeBundle = globSync('src/**/*.{tsx,jsx}', {
  cwd: join(srcRoot, '..'),
  absolute: true,
  ignore: ['**/*.test.*', '**/*.spec.*'],
})
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

describe('medical theme full-scale audit', () => {
  it('loads every normalization layer in main.jsx', () => {
    const main = tokenFiles[11];
    expect(main).toContain("import './styles/medical-color-layer.css'");
    expect(main).toContain("import './styles/medical-type-layer.css'");
    expect(main).toContain("import './styles/color-normalization.css'");
    expect(main).toContain("import './styles/text-normalization.css'");
    expect(main).toContain("import './styles/surface-normalization.css'");
    expect(main).toContain("import './styles/medical-card-layer.css'");
    expect(main).toContain("import './styles/card-contrast-normalization.css'");
  });

  it('defines medical card surface contracts with paired bg/fg tokens', () => {
    const cardLayer = tokenFiles[7];
    const cardNorm = tokenFiles[8];
    expect(cardLayer).toContain('--medical-card-bg:');
    expect(cardLayer).toContain('--medical-card-fg:');
    expect(cardLayer).toContain('--medical-card-solid-fg:');
    expect(cardNorm).toContain('--card-contract-bg');
    expect(cardNorm).toContain('--card-contract-fg');
  });

  it('locks theme preference off and standard theme to light', () => {
    const themeConfig = tokenFiles[9];
    expect(themeConfig).toContain("standardTheme: 'light'");
    expect(themeConfig).toContain('themePreferenceEnabled: false');
  });

  it('does not ship a dark theme token block', () => {
    const themeTokens = tokenFiles[2]; // theme-tokens.css
    expect(themeTokens).not.toMatch(/html\[data-theme='dark'\]/);
  });

  it('maps emergency and native-ai text to medical ink, not white fallbacks', () => {
    const emergencyTokens = tokenFiles[3];
    const surfaceNorm = tokenFiles[6]; // surface-normalization.css
    expect(emergencyTokens).toContain('--ed-text-primary:');
    expect(emergencyTokens).toContain('#111827');
    expect(surfaceNorm).toContain('--nai-text: var(--medical-text-body');
  });

  it('avoids dark navy panel backgrounds in product CSS', () => {
    expect(cssBundle).not.toMatch(/background:\s*rgba\(15,\s*23,\s*42,\s*0\.(78|82|9|92|94)\)/);
    expect(cssBundle).not.toMatch(/background:\s*#0[dD]1117\b/);
    expect(cssBundle).not.toMatch(/background:\s*#0[fF]172[aA]\b/);
  });

  it('replaces legacy royal blue accents with sky blue in product code', () => {
    const productCode = globSync('src/**/*.{tsx,jsx}', {
      cwd: join(srcRoot, '..'),
      absolute: true,
      ignore: ['**/*.test.*', '**/*.spec.*', '**/medicalThemeAudit.test.js'],
    })
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(productCode).not.toMatch(/#2563EB|#2563eb/);
    expect(cssBundle).not.toMatch(/#2563eb\b/i);
  });

  it('avoids white-on-light card text fallbacks in product card CSS', () => {
    const cardCss = globSync('src/**/*.{css}', {
      cwd: join(srcRoot, '..'),
      absolute: true,
      ignore: ['**/*.test.*'],
    })
      .filter((file) => /card|panel|widget/i.test(file))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(cardCss).not.toMatch(/var\(--app-text-strong,\s*#f8fafc\)/i);
    expect(cardCss).not.toMatch(/var\(--color-text-primary,\s*#f8fafc\)/i);
    expect(cardCss).not.toMatch(/color-mix\([^)]*#0f172a/i);
  });
});