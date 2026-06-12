import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildUxDebtAudit,
  formatUxDebtReportMarkdown,
  UX_DEBT_CLASSIFICATIONS,
  UX_SURFACE_TYPES,
} from './uxDebtEliminationEngine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = dirname(__dirname);

function read(relativePath) {
  return readFileSync(join(srcRoot, relativePath), 'utf8');
}

function currentSourceSnapshot() {
  return {
    appShellJsx: read('layout/AppShell.jsx'),
    appShellCss: read('layout/AppShell.css'),
    quickCommandCss: read('components/QuickCommandLauncher.css'),
    drawerJsx: read('components/ui/Drawer.jsx'),
  };
}

describe('UX Debt Elimination Engine', () => {
  it('audits every requested UX surface and computes a 0-100 health score', () => {
    const audit = buildUxDebtAudit({ sourceSnapshot: currentSourceSnapshot() });

    expect(audit.healthScore).toBeGreaterThanOrEqual(0);
    expect(audit.healthScore).toBeLessThanOrEqual(100);
    expect(audit.summary.auditedSurfaceCount).toBeGreaterThan(100);
    expect(audit.auditedSurfaces.map((surface) => surface.type)).toEqual(
      expect.arrayContaining([
        UX_SURFACE_TYPES.NAVIGATION,
        UX_SURFACE_TYPES.ROUTES,
        UX_SURFACE_TYPES.CARDS,
        UX_SURFACE_TYPES.FORMS,
        UX_SURFACE_TYPES.DIALOGS,
        UX_SURFACE_TYPES.DRAWERS,
        UX_SURFACE_TYPES.TABLES,
        UX_SURFACE_TYPES.MAPS,
        UX_SURFACE_TYPES.CALCULATORS,
        UX_SURFACE_TYPES.DASHBOARDS,
      ])
    );
  });

  it('classifies duplicate, conflicting, hidden, obsolete, and accessibility debt', () => {
    const audit = buildUxDebtAudit({
      routes: {
        dashboard: '/dashboard',
        home: '/dashboard',
        calculators: '/tools/calculators',
      },
      aliasGroups: {
        legacy: {
          target: '/dashboard',
          aliases: Array.from({ length: 22 }, (_, index) => `/legacy-${index}`),
        },
      },
      navItems: [
        { id: 'tools', label: 'Tools', path: '/tools' },
        { id: 'tools-alt', label: 'Tools', path: '/catalog' },
      ],
      userFacingTools: Array.from({ length: 25 }, (_, index) => ({
        id: `calc-${index}`,
        name: `Calculator ${index}`,
        route: '/tools/calculators',
      })),
      canonicalTools: [],
      calculators: [],
      responsivePages: [{ id: 'dashboard', path: '/dashboard' }],
      responsiveViewports: [{ width: 390 }],
      manualQaSections: [],
      sourceSnapshot: {
        appShellJsx: '<aside className="ed-nav-rail" /><nav className="app-shell-bottom-nav" />',
        appShellCss: '.app-shell-bottom-nav { min-height: var(--app-bottom-nav-height, 56px); }',
        quickCommandCss: 'bottom: var(--app-bottom-nav-height, 56px);',
        drawerJsx: '<div className="drawer" />',
      },
    });

    const classifications = [...new Set(audit.findings.map((finding) => finding.classification))];
    expect(classifications).toEqual(
      expect.arrayContaining(Object.values(UX_DEBT_CLASSIFICATIONS))
    );
    expect(audit.summary.criticalFindings).toBeGreaterThan(0);
    expect(audit.healthScore).toBeLessThan(100);
  });

  it('guards the current app shell against duplicate sidebar and bottom navigation', () => {
    const audit = buildUxDebtAudit({ sourceSnapshot: currentSourceSnapshot() });

    expect(audit.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'conflicting-sidebar-bottom-nav',
        }),
      ])
    );
    expect(audit.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'obsolete-bottom-nav-spacing',
        }),
      ])
    );
    expect(audit.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'obsolete-quick-command-bottom-nav-offset',
        }),
      ])
    );
  });

  it('formats a UX Debt Report with health, classifications, findings, and automated checks', () => {
    const markdown = formatUxDebtReportMarkdown(
      buildUxDebtAudit({ sourceSnapshot: currentSourceSnapshot() })
    );

    expect(markdown).toContain('# UX Debt Report');
    expect(markdown).toContain('UX health score');
    expect(markdown).toContain('## Classification Counts');
    expect(markdown).toContain('## Findings');
    expect(markdown).toContain('## Automated Checks');
    expect(markdown).toContain('No page should feel like it belongs to a different application');
  });
});
