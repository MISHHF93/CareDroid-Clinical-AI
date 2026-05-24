import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const themeTokensCss = readFileSync(join(__dirname, 'theme-tokens.css'), 'utf8');
const themeBridgeCss = readFileSync(join(__dirname, 'theme-legacy-bridge.css'), 'utf8');
const appShellCss = readFileSync(join(srcRoot, 'layout/AppShell.css'), 'utf8');
const authShellCss = readFileSync(join(srcRoot, 'layout/AuthShell.css'), 'utf8');
const commandDashboardCss = readFileSync(join(srcRoot, 'pages/CommandDashboard.css'), 'utf8');
const medicalIotCss = readFileSync(join(srcRoot, 'pages/MedicalIotDashboard.css'), 'utf8');
const dashboardCss = readFileSync(join(srcRoot, 'pages/Dashboard.css'), 'utf8');
const chartCss = readFileSync(join(srcRoot, 'components/dashboard/DashboardVisualizations.css'), 'utf8');
const toolsOverviewCss = readFileSync(join(srcRoot, 'pages/tools/ToolsOverview.css'), 'utf8');
const toolPageLayoutCss = readFileSync(join(srcRoot, 'pages/tools/ToolPageLayout.css'), 'utf8');
const calculatorsCss = readFileSync(join(srcRoot, 'pages/tools/Calculators.css'), 'utf8');
const buttonCss = readFileSync(join(srcRoot, 'components/ui/button.css'), 'utf8');
const cardCss = readFileSync(join(srcRoot, 'components/ui/card.css'), 'utf8');
const inputCss = readFileSync(join(srcRoot, 'components/ui/input.css'), 'utf8');
const badgeCss = readFileSync(join(srcRoot, 'components/ui/Badge.css'), 'utf8');
const alertCss = readFileSync(join(srcRoot, 'components/ui/Alert.css'), 'utf8');

describe('theme color system revamp', () => {
  it('defines clean neutral light and OLED-conscious dark root palettes', () => {
    expect(themeTokensCss).toMatch(/html\[data-theme='light'\][\s\S]*--app-bg:\s*#fbfbfc/);
    expect(themeTokensCss).toMatch(/html\[data-theme='light'\][\s\S]*--app-surface-1:\s*#ffffff/);
    expect(themeTokensCss).toMatch(/html\[data-theme='dark'\][\s\S]*--app-bg:\s*#050505/);
    expect(themeTokensCss).toMatch(/html\[data-theme='dark'\][\s\S]*--app-surface-1:\s*#101114/);
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
      authShellCss,
      commandDashboardCss,
      medicalIotCss,
      dashboardCss,
      chartCss,
      toolsOverviewCss,
    ].join('\n');

    expect(keyCss).not.toMatch(/#0ea5e9|#14b8a6|#764ba2|rgba\(14,\s*165,\s*233|rgba\(20,\s*184,\s*166|rgba\(0,\s*255,\s*136/);
    expect(keyCss).toContain('var(--app-surface-1)');
    expect(keyCss).toContain('var(--app-accent-interactive)');
  });

  it('keeps charts readable through theme-aware axis, tooltip, state, and chart color tokens', () => {
    expect(chartCss).toContain('var(--app-fg-muted)');
    expect(chartCss).toContain('var(--app-panel-border)');
    expect(chartCss).toContain('var(--app-surface-1)');
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
