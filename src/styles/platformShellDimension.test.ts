import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const designTokensCss = readFileSync(join(__dirname, 'design-tokens.css'), 'utf8');
const shellHeaderPolishCss = readFileSync(join(__dirname, 'shell-header-polish.css'), 'utf8');
const layoutEngineCss = readFileSync(join(__dirname, 'layout-engine.css'), 'utf8');
const medicalShellLayerCss = readFileSync(join(__dirname, 'medical-shell-layer.css'), 'utf8');
const appShellSource = readFileSync(join(__dirname, '../components/AppShell.tsx'), 'utf8');
const sidebarSource = readFileSync(join(__dirname, '../components/Sidebar.tsx'), 'utf8');

describe('platform shell dimension contract', () => {
  it('defines canonical chrome heights in shell-header-polish', () => {
    expect(shellHeaderPolishCss).toContain('--cdl-header-height: 52px');
    // shell-header-polish.css imports last in design-system.css, so its
    // --cdl-route-tab-height wins the cascade over medical-shell-layer.css's
    // (52px) and shell-tokens.css's earlier definitions — a deliberate later
    // tightening pass (44px -> 52px -> 48px per git history), not a drift.
    expect(shellHeaderPolishCss).toContain('--cdl-route-tab-height: 48px');
    expect(shellHeaderPolishCss).toContain('--cdl-chrome-stack-height');
  });

  it('aligns design-tokens shell header height with CDL chrome', () => {
    expect(designTokensCss).toMatch(
      /--app-shell-header-height:\s*var\(--cdl-header-height/,
    );
    expect(medicalShellLayerCss).toContain('--cdl-header-height: 52px');
    expect(medicalShellLayerCss).toContain('--cdl-sidebar-width: 232px');
  });

  it('uses chrome stack height for layout-engine scroll padding', () => {
    expect(layoutEngineCss).toContain('--cdl-chrome-stack-height');
    expect(layoutEngineCss).toContain('--app-layout-header-height');
    expect(layoutEngineCss).toContain(
      'scroll-padding-top: calc(var(--app-layout-header-height)',
    );
    expect(shellHeaderPolishCss).toContain('scroll-padding-top: calc(');
    expect(shellHeaderPolishCss).toContain('var(--cdl-chrome-stack-height)');
  });

  it('wires shell chrome stack in AppShell', () => {
    expect(appShellSource).toContain('<Header />');
    expect(appShellSource).toContain('<ShellRouteTab');
    expect(appShellSource).toContain('<RouteChromeProvider>');
    expect(appShellSource).toContain('<CopilotPanel />');
    expect(appShellSource).toContain('useCopilotChromeAccess');
  });

  it('exposes copilot session controls in sidebar chrome', () => {
    expect(sidebarSource).toContain('SidebarChromeControls');
    expect(sidebarSource).toContain("item.id === 'copilot'");
    expect(sidebarSource).toContain('openDockedCopilot');
  });
});