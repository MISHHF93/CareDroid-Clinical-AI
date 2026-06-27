import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const read = (relativePath) => readFileSync(join(srcRoot, relativePath), 'utf8');

describe('compact UX/UI flattening contracts', () => {
  it('defines shared compact spacing, card, panel, and control tokens', () => {
    const tokens = read('styles/design-tokens.css');
    for (const token of [
      '--compact-page-gap',
      '--compact-panel-gap',
      '--compact-card-padding',
      '--compact-panel-padding',
      '--compact-control-height',
      '--compact-card-radius',
      '--compact-panel-radius',
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it('normalizes primary navigation around canonical command app entries', () => {
    const shellNav = read('config/unified-navigation.config.ts');
    for (const id of [
      "id: 'whiteboard'",
      "id: 'ems'",
      "id: 'referrals'",
      "id: 'capacity'",
      "id: 'tools'",
      "id: 'shift'",
      "id: 'settings'",
    ]) {
      expect(shellNav).toContain(id);
    }
    expect(shellNav).toContain("featureGate: 'clinical_tools'");
    expect(shellNav).not.toContain("id: 'fleet'");
    expect(shellNav).not.toContain("id: 'security'");
    expect(shellNav).not.toContain("id: 'maps'");
  });

  it('keeps /tools canonical and removes duplicate developer catalog shortcuts', () => {
    const toolsOverview = read('pages/tools/ToolsOverview.tsx');
    const appShell = read('layout/AppShell.tsx');
    expect(toolsOverview).not.toContain("navigate('/tools/catalog')");
    expect(appShell).not.toContain("navigate('/tools/catalog')");
    expect(appShell).not.toContain('Browse All Tools');
  });

  it('uses compact cards and panels across dashboard, tools, calculators, chat, maps, and IoT', () => {
    const css = [
      read('pages/CommandDashboard.css'),
      read('pages/tools/ToolsOverview.css'),
      read('pages/tools/Calculators.css'),
      read('pages/MedicalIotDashboard.css'),
      read('pages/LiveTrackingMap.css'),
      read('pages/HospitalMapDashboard.css'),
      read('pages/fleet/FleetLiveMap.css'),
    ].join('\n');
    expect(css).toContain('var(--compact-panel-radius');
    expect(css).toContain('var(--compact-control-height');
    expect(css).toContain('var(--compact-panel-padding');
    expect(css).not.toMatch(/transform:\s*translateY\(-4px\)/);
  });

  it('keeps quick command compact against the mobile safe-area bottom', () => {
    const quickCommand = read('components/CommandPalette.css');
    expect(quickCommand).toContain('bottom: max(10px, env(safe-area-inset-bottom, 0px))');
    expect(quickCommand).not.toContain('var(--app-bottom-nav-height, 56px)');
    expect(quickCommand).toContain('var(--compact-panel-radius');
    expect(quickCommand).toContain('min-height: 44px');
  });
});
