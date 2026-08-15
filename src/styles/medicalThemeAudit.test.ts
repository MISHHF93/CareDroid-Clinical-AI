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
  'config/theme.tokens.ts',
  'config/medicalTheme.constants.ts',
  'styles/design-system.css',
  'main.tsx',
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
  it('loads every normalization layer through the design-system entry', () => {
    const designSystem = tokenFiles[11];
    const main = tokenFiles[12];
    expect(main).toContain("import './styles/design-system.css'");
    expect(designSystem).toContain("@import './medical-color-layer.css'");
    expect(designSystem).toContain("@import './medical-shell-layer.css'");
    expect(designSystem).toContain("@import './medical-type-layer.css'");
    expect(designSystem).toContain("@import './color-normalization.css'");
    expect(designSystem).toContain("@import './text-normalization.css'");
    expect(designSystem).toContain("@import './surface-normalization.css'");
    expect(designSystem).toContain("@import './medical-card-layer.css'");
    expect(designSystem).toContain("@import './card-contrast-normalization.css'");
    expect(designSystem).toContain("@import './design-system-bridge.css'");
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

  it('defaults standard theme to light with theme preference enabled', () => {
    const themeConfig = tokenFiles[9];
    expect(themeConfig).toContain("standardTheme: 'light'");
    expect(themeConfig).toContain('themePreferenceEnabled: true');
  });

  it('ships a complete dark theme token block covering every --app-* surface', () => {
    const themeTokens = tokenFiles[2]; // theme-tokens.css
    expect(themeTokens).toMatch(/html\[data-theme='dark'\]\s*\{/);
    const darkBlock = themeTokens.slice(themeTokens.indexOf("html[data-theme='dark']"));
    for (const token of [
      '--app-bg:',
      '--app-fg:',
      '--app-accent:',
      '--app-accent-interactive:',
      '--app-panel-bg:',
      '--app-surface-1:',
    ]) {
      expect(darkBlock).toContain(token);
    }
  });

  it('covers --medical-canvas in the dark block, matching its --medical-surface-page sibling (HEAL-212)', () => {
    // --medical-canvas was declared once, on bare :root, at its light value
    // (#f6f9fc), with no html[data-theme='dark'] override anywhere in the
    // codebase -- every sibling surface token in this same dark block
    // (--medical-white, --medical-surface-page, etc.) gets redefined here,
    // this one was silently missed. .emergency-app-shell's own background
    // resolves through --ml-surface-page -> --medical-canvas, so the whole
    // app shell's background stayed stuck at the light canvas color in
    // dark mode while sidebar/cards/text all correctly switched -- caught
    // live via a dark-mode screenshot, page titles were nearly illegible
    // (light text on the still-light shell background).
    const colorLayer = tokenFiles[0]; // medical-color-layer.css
    const darkBlock = colorLayer.slice(colorLayer.indexOf("html[data-theme='dark']"));
    expect(darkBlock).toContain('--medical-canvas:');
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