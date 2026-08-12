import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '../config/unified-navigation.config';

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
    // NAV_ITEMS is computed at runtime from CANONICAL_ROUTE_MAP rather than
    // declared as literal { id: '...' } object text, so check the resolved
    // values instead of grepping source.
    const navIds = new Set(NAV_ITEMS.map((item) => item.id));
    for (const id of ['whiteboard', 'ems', 'referrals', 'capacity', 'tools', 'shift', 'settings']) {
      expect(navIds.has(id), id).toBe(true);
    }
    expect(navIds.has('security')).toBe(false);
    expect(navIds.has('maps')).toBe(false);
  });

  it('keeps /tools canonical and removes duplicate developer catalog shortcuts', () => {
    const toolsOverview = read('pages/tools/ToolsOverview.tsx');
    const appShell = read('components/AppShell.tsx');
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

  it('keeps quick command touch targets accessible', () => {
    // The quick-command UI is CommandPalette.tsx, which renders entirely via
    // inline styles -- CommandPalette.css and QuickCommandLauncher.css were
    // both dead CSS left over from an earlier bottom-docked launcher design
    // (no component imports either), deleted alongside this test's fix. The
    // current design is a centered modal (backdrop uses alignItems:
    // 'flex-start' + paddingTop, not a viewport-bottom dock), so the old
    // safe-area-inset-bottom assertion no longer maps to anything real; the
    // touch-target-size contract it was also guarding still applies and is
    // checked directly against the live styles object below.
    const commandPalette = read('components/CommandPalette.tsx');
    expect(commandPalette).toMatch(/resultItem:\s*\{[\s\S]*minHeight:\s*54/);
    expect(commandPalette).toMatch(/inputRow:\s*\{[\s\S]*minHeight:\s*48/);
  });
});
