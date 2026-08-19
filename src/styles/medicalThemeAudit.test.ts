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

  it('operational-command-bar-focus.css uses the theme-aware focus-ring token, not a static gray (HEAL-214)', () => {
    // Was a hardcoded outline: 2px solid #374151 on 4 command-bar button
    // classes -- the app's own focus-ring token (--app-focus-ring-aa) is
    // #374151 in light mode too, so this only diverged visibly once dark
    // mode flips the token to #38bdf8; these 4 controls kept the dull gray
    // regardless of theme. Verified live via a real :focus-visible probe.
    const focusCss = readFileSync(
      join(srcRoot, 'styles/operational-command-bar-focus.css'),
      'utf8',
    );
    expect(focusCss).toContain('var(--app-focus-ring-aa, #374151)');
  });

  it('PostEdOrientationBadge.css has dark-mode overrides for all 3 status variants (HEAL-214)', () => {
    // Light-mode text colors (#b45309/#475569/#047857) are WCAG-AA-tuned
    // for a near-white background; once the color-mix background blends
    // with a dark card surface instead, measured contrast drops to ~2.3:1
    // (needs 4.5:1) -- a real accessibility failure, not cosmetic. Rendered
    // via PatientCard.tsx, so this reaches every patient card.
    const badgeCss = readFileSync(
      join(srcRoot, 'components/predictive/PostEdOrientationBadge.css'),
      'utf8',
    );
    const darkBlock = badgeCss.slice(badgeCss.indexOf("html[data-theme='dark']"));
    expect(darkBlock).toContain('.post-ed-orientation-badge--admit');
    expect(darkBlock).toContain('var(--app-warning, #fbbf24)');
    expect(darkBlock).toContain('.post-ed-orientation-badge--edou');
    expect(darkBlock).toContain('var(--medical-ink-muted, #94a3b8)');
    expect(darkBlock).toContain('.post-ed-orientation-badge--discharge');
    expect(darkBlock).toContain('var(--app-success, #4ade80)');
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

  it('OperationalHandoffDomainBar.css cards use a theme-aware surface token, not a hardcoded near-white rgba (HEAL-317)', () => {
    // .operational-handoff-domain-bar__domain's background was a hardcoded
    // rgba(255,255,255,0.94) with no dark-theme override, while its own
    // __metric strong text reads var(--color-text-primary, var(--medical-ink,
    // ...)) -- which correctly turns light-colored in dark mode -- leaving
    // light text on a still-near-white card, confirmed live via
    // elementFromPoint at the card's real screen coordinates plus a
    // dark-theme toggle.
    const domainBarCss = readFileSync(
      join(srcRoot, 'components/whiteboard/OperationalHandoffDomainBar.css'),
      'utf8',
    );
    expect(domainBarCss).toContain('var(--app-surface-2, rgba(255, 255, 255, 0.94))');
    expect(domainBarCss).not.toMatch(
      /\.operational-handoff-domain-bar__domain\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.94\);/,
    );
  });

  it('cdl-situation-graphic-card tinted backgrounds mix into a theme-aware surface, not a hardcoded #fff (HEAL-317)', () => {
    // The "Happening Now"/"Needs Attention" cards on Hospital Command Center
    // mixed 5-6% of a status color into a literal #fff regardless of theme
    // -- same illegibility pattern as the domain-bar fix above, confirmed
    // live the same way.
    const figmaPolishCss = readFileSync(join(srcRoot, 'styles/clinical-figma-polish.css'), 'utf8');
    for (const variant of ['information', 'warning', 'critical']) {
      const ruleMatch = figmaPolishCss.match(
        new RegExp(`\\.cdl-situation-graphic-card--${variant}\\s*\\{[^}]*\\}`),
      );
      expect(ruleMatch).not.toBeNull();
      expect(ruleMatch![0]).toContain('var(--app-surface-2, #fff)');
    }
  });

  it('MEDICAL_THEME wraps its surface/ink values in theme-aware var(--app-*) tokens, not bare hex (HEAL-347.11)', () => {
    // config/medicalTheme.constants.ts backs 24 components' inline JS styles
    // (CommandPalette, PatientDetailPanel, QuickIntake, WhoNextPanel, several
    // calculators/dashboards) -- unlike CSS classes, inline styles never
    // picked up html[data-theme='dark']'s overrides at all, so this whole
    // module was a plain hardcoded light palette regardless of theme.
    // Confirmed live: CommandPalette rendered as a stark white modal over an
    // otherwise fully dark UI. Same bug class this file already guards
    // against in CSS (HEAL-212/214/317), just never checked here.
    const medicalThemeConstants = tokenFiles[10];
    for (const token of [
      'surfacePage: \'var(--app-bg,',
      'surfaceCard: \'var(--app-panel-bg,',
      'surfaceMuted: \'var(--app-surface-muted,',
      'ink: \'var(--app-fg,',
      'inkMuted: \'var(--app-fg-muted,',
      'accent: \'var(--app-accent,',
    ]) {
      expect(medicalThemeConstants).toContain(token);
    }
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