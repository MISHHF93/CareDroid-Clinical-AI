import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const themeTokensCss = readFileSync(join(__dirname, 'theme-tokens.css'), 'utf8');
const colorNormalizationCss = readFileSync(join(__dirname, 'color-normalization.css'), 'utf8');
const medicalColorLayerCss = readFileSync(join(__dirname, 'medical-color-layer.css'), 'utf8');
const medicalTypeLayerCss = readFileSync(join(__dirname, 'medical-type-layer.css'), 'utf8');
const textNormalizationCss = readFileSync(join(__dirname, 'text-normalization.css'), 'utf8');
const medicalCardLayerCss = readFileSync(join(__dirname, 'medical-card-layer.css'), 'utf8');
const cardContrastCss = readFileSync(join(__dirname, 'card-contrast-normalization.css'), 'utf8');
const profileSurfaceCss = readFileSync(
  join(__dirname, 'profile-surface-normalization.css'),
  'utf8',
);
const themeBridgeCss = readFileSync(join(__dirname, 'theme-legacy-bridge.css'), 'utf8');
const appShellCss = readFileSync(join(srcRoot, 'components/app-shell.css'), 'utf8');
const commandDashboardCss = readFileSync(
  join(srcRoot, 'components/emergency/CommandDashboard.css'),
  'utf8',
);
const profilePageCss = readFileSync(join(srcRoot, 'pages/Profile.css'), 'utf8');
const chartCss = readFileSync(
  join(srcRoot, 'components/dashboard/DashboardVisualizations.css'),
  'utf8',
);
const toolsOverviewCss = readFileSync(join(srcRoot, 'pages/tools/ToolsOverview.css'), 'utf8');
const toolPageLayoutCss = readFileSync(join(srcRoot, 'pages/tools/ToolPageLayout.css'), 'utf8');
const calculatorsCss = readFileSync(join(srcRoot, 'pages/tools/Calculators.css'), 'utf8');
const buttonCss = readFileSync(join(srcRoot, 'components/ui/button.css'), 'utf8');
const cardCss = readFileSync(join(srcRoot, 'components/ui/card.css'), 'utf8');
const inputCss = readFileSync(join(srcRoot, 'components/ui/input.css'), 'utf8');
const badgeCss = readFileSync(join(srcRoot, 'components/ui/Badge.css'), 'utf8');
const alertCss = readFileSync(join(srcRoot, 'components/ui/Alert.css'), 'utf8');
const platformEntryCss = readFileSync(join(srcRoot, 'pages/PlatformEntryHub.css'), 'utf8');
const settingsCss = readFileSync(join(srcRoot, 'pages/Settings.css'), 'utf8');
const teamMgmtCss = readFileSync(join(srcRoot, 'pages/team/TeamManagement.css'), 'utf8');
const notificationCss = readFileSync(
  join(srcRoot, 'components/notifications/NotificationToast.css'),
  'utf8',
);
const toolPreflightCss = readFileSync(
  join(srcRoot, 'components/clinical/ToolPreflightStatus.css'),
  'utf8',
);

const LEGACY_NEON_PATTERN = /rgba\(0,\s*255,\s*136|#ff6b6b|#ff5252|#8ed8ff|rgba\(79,\s*70,\s*229/;

describe('theme color system revamp', () => {
  it('defines the standard medical root palette on every color layer', () => {
    // --app-* light-theme tokens now resolve through --medical-* (see file's
    // own header comment: "Color alignment") rather than repeating literal
    // hex values -- the fallback values below are still the source of truth.
    expect(themeTokensCss).toMatch(
      /html,\s*html\[data-theme='light'\][\s\S]*--app-bg:\s*var\(--medical-canvas,\s*#f6f9fc\)/,
    );
    expect(themeTokensCss).toMatch(
      /html,\s*html\[data-theme='light'\][\s\S]*--app-surface-1:\s*var\(--medical-white,\s*#ffffff\)/,
    );
    // Dark mode is now a real, shipped feature (ThemeToggle + persisted
    // preference) -- see medicalThemeAudit.test.ts for the dark-block audit.
    expect(themeTokensCss).toMatch(/html\[data-theme='dark'\]\s*\{/);
  });

  it('normalizes legacy aliases through the medical color layer', () => {
    expect(medicalColorLayerCss).toContain('--medical-accent:');
    expect(colorNormalizationCss).toContain('--color-background: var(--medical-surface-page)');
    expect(colorNormalizationCss).toContain('--status-info: var(--medical-accent)');
    expect(colorNormalizationCss).toContain(':is(.app-shell, .emergency-app-shell)');
  });

  it('defines medical text hierarchy and shell-wide typography normalization', () => {
    expect(medicalTypeLayerCss).toContain('--medical-text-heading:');
    expect(medicalTypeLayerCss).toContain('--medical-text-link:');
    expect(medicalTypeLayerCss).toContain('--medical-status-critical-text:');
    expect(textNormalizationCss).toContain(
      ':is(.app-shell, .emergency-app-shell) :is(h1, h2, h3, h4, h5, h6)',
    );
    expect(textNormalizationCss).toContain('.clinical-calculator-modal');
    expect(textNormalizationCss).toContain('var(--medical-text-link)');
  });

  it('defines card surface contracts with readable foreground pairings', () => {
    expect(medicalCardLayerCss).toContain('--medical-card-bg:');
    expect(medicalCardLayerCss).toContain('--medical-card-fg:');
    expect(medicalCardLayerCss).toContain('--medical-card-solid-fg:');
    expect(cardContrastCss).toContain('--card-contract-bg');
    expect(cardContrastCss).toContain('--card-contract-fg');
    expect(cardCss).toContain('var(--app-text-primary)');
  });

  it('uses the CCDS Primary Clinical Blue as the medical product accent across the standard theme', () => {
    expect(themeTokensCss).toMatch(
      /html,\s*html\[data-theme='light'\][\s\S]*--app-accent:\s*var\(--medical-accent,\s*#075985\)/,
    );
    expect(themeTokensCss).toMatch(
      /html,\s*html\[data-theme='light'\][\s\S]*--app-accent-interactive:\s*var\(--medical-accent,\s*#075985\)/,
    );
    expect(themeTokensCss).toMatch(
      /html,\s*html\[data-theme='light'\][\s\S]*--app-link-fg:\s*var\(--medical-accent-hover,\s*#054364\)/,
    );
    expect(medicalTypeLayerCss).toContain('--medical-text-link: var(--medical-sky-700)');
  });

  it('normalizes profile surfaces with readable link contrast on white cards', () => {
    expect(profileSurfaceCss).toContain('.profile-overview-card');
    expect(profileSurfaceCss).toContain('var(--medical-text-link');
    expect(themeTokensCss).toContain('--sidebar-item-active-fg: var(--app-fg)');
  });

  it('exposes semantic aliases for accents, surfaces, focus, and charts', () => {
    for (const token of [
      '--surface-muted',
      '--accent-hover',
      '--chart-1',
      '--chart-2',
      '--chart-3',
      '--chart-4',
      '--chart-5',
      '--chart-6',
    ]) {
      expect(themeBridgeCss).toContain(token);
    }
    for (const token of [
      '--app-background',
      '--app-surface-raised',
      '--app-border-strong',
      '--app-text-primary',
      '--app-elevation-card',
      '--app-status-online',
      '--app-status-critical',
    ]) {
      expect(themeTokensCss).toContain(token);
    }
  });

  it('keeps key layout surfaces token-driven without legacy dominant blue/green backgrounds', () => {
    const keyCss = [
      appShellCss,
      commandDashboardCss,
      profilePageCss,
      chartCss,
      toolsOverviewCss,
    ].join('\n');

    expect(keyCss).not.toMatch(/#14b8a6|#764ba2|rgba\(20,\s*184,\s*166|rgba\(0,\s*255,\s*136/);
    expect(profilePageCss).not.toMatch(/rgba\(0,\s*255,\s*136/);
    expect(keyCss).toContain('var(--app-surface-1)');
    expect(keyCss).toContain('var(--app-accent-interactive)');
  });

  it('keeps charts readable through theme-aware axis, tooltip, state, and chart color tokens', () => {
    expect(chartCss).toContain('var(--app-fg-muted)');
    expect(chartCss).toContain('var(--app-panel-border)');
    expect(chartCss).toContain('var(--app-surface-1)');
  });

  it('bridges legacy aliases on :root and html', () => {
    expect(themeBridgeCss).toMatch(/:root,\s*html\s*\{/);
    expect(themeBridgeCss).toContain('--muted-text: var(--app-fg-muted)');
  });

  it('defines accent tint scale for token-native highlights', () => {
    for (const token of [
      '--medical-accent-tint-faint',
      '--medical-accent-tint-subtle',
      '--medical-accent-tint-mid',
      '--medical-accent-ring',
      '--medical-accent-ring-strong',
    ]) {
      expect(medicalColorLayerCss).toContain(token);
    }
  });

  it('migrates previously neon-heavy surfaces to medical tokens', () => {
    const migratedCss = [
      platformEntryCss,
      settingsCss,
      teamMgmtCss,
      notificationCss,
      toolPreflightCss,
    ].join('\n');

    expect(migratedCss).not.toMatch(LEGACY_NEON_PATTERN);
    expect(platformEntryCss).toContain('var(--app-fg-muted)');
    expect(platformEntryCss).toContain('var(--app-surface-1)');
    expect(platformEntryCss).not.toContain('rgba(255, 255, 255, 0.03)');
  });

  it('keeps shared primitives and tools token-native instead of neon one-offs', () => {
    const sharedCss = [
      buttonCss,
      cardCss,
      inputCss,
      badgeCss,
      alertCss,
      toolsOverviewCss,
      toolPageLayoutCss,
      calculatorsCss,
    ].join('\n');

    expect(sharedCss).toContain('var(--app-accent-action');
    expect(sharedCss).toContain('var(--app-border');
    expect(sharedCss).not.toMatch(/rgba\(0,\s*255,\s*136|#ff6b6b|#ff5252|rgba\(79,\s*70,\s*229/);
    expect(sharedCss).not.toMatch(/text-shadow:\s*0 0/);
  });
});
