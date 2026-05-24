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
});
