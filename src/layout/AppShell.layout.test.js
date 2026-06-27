import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { COMPACT_MEDIA_QUERY } from './breakpoints';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appShellCss = readFileSync(join(__dirname, 'AppShell.css'), 'utf8');
const sidebarCss = readFileSync(join(__dirname, '../components/Sidebar.css'), 'utf8');
const layoutTokensCss = readFileSync(join(__dirname, '../styles/layout-breakpoints.css'), 'utf8');
const indexCss = readFileSync(join(__dirname, '../index.css'), 'utf8');
const appShellJsx = readFileSync(join(__dirname, 'AppShell.jsx'), 'utf8');
const appJsx = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const crisisModeCss = readFileSync(join(__dirname, '../components/CrisisMode.css'), 'utf8');
const emsCriticalBroadcastJsx = readFileSync(
  join(__dirname, '../components/EMSCriticalBroadcast.jsx'),
  'utf8'
);
const emsCriticalBroadcastCss = readFileSync(
  join(__dirname, '../components/EMSCriticalBroadcast.css'),
  'utf8'
);

describe('single AppShell contract', () => {
  it('keeps AppShell as the only route shell wrapper', () => {
    expect(appJsx.match(/<AppShell\b/g)).toHaveLength(1);
    expect(appJsx).toContain('function RootLayout()');
    expect(appJsx).toContain('<AppShell>');
    expect(appJsx).toContain('<Outlet />');
    expect(appJsx).not.toContain('<AuthShell');
    expect(appJsx).not.toContain('<PublicShell');
    expect(appJsx).not.toContain("from './layout/AuthShell'");
    expect(appJsx).not.toContain("from './layout/PublicShell'");
  });

  it('renders one canonical Sidebar, one header, one main region, and one Copilot panel', () => {
    expect(appShellJsx.match(/<Sidebar \/>/g)).toHaveLength(1);
    expect(appShellJsx.match(/className="ed-os-header"/g)).toHaveLength(1);
    expect(appShellJsx.match(/data-layout-role={LAYOUT_SCROLL_CONTRACT.mainContentRole}/g)).toHaveLength(1);
    expect(appShellJsx.match(/className="ed-copilot-panel"/g)).toHaveLength(1);
    expect(sidebarCss).toContain("aside[aria-label='Emergency navigation']");
    expect(appShellJsx).not.toContain('app-shell-bottom-nav');
  });

  it('header contains the required shared controls', () => {
    expect(appShellJsx).toContain('Emergency OS');
    expect(appShellJsx).toContain('formatShiftClock(clock)');
    expect(appShellJsx).toContain('<CapacityBadge');
    expect(appShellJsx).toContain('<Bell');
    expect(appShellJsx).toContain('<StaffAvatar');
  });

  it('passes dashboard prompt deep links into the persistent ED Copilot', () => {
    expect(appShellJsx).toContain("params.get('prompt')");
    expect(appShellJsx).toContain("params.get('tool') || params.get('calc')");
    expect(appShellJsx).toContain('Launch ${tool} in ED Copilot workflow.');
    expect(appShellJsx).toContain('prefillText={copilotPrefillText}');
  });

  it('main content owns scrolling inside the shell viewport', () => {
    expect(appShellCss).toMatch(/\.ed-os-shell\s*\{[\s\S]*height:\s*var\(--app-viewport-height/);
    expect(appShellCss).toMatch(/\.ed-os-shell\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.ed-os-shell__body\s*\{[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(/\.ed-os-main,[\s\S]*\.app-shell-main-content\s*\{[\s\S]*overflow:\s*auto/);
    expect(appShellCss).toMatch(/\.ed-os-main,[\s\S]*\.app-shell-main-content\s*\{[\s\S]*min-width:\s*0/);
  });

  it('keeps document scroll unlocked outside explicit overlay locks', () => {
    expect(indexCss).toMatch(/html[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).toMatch(/body[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).toMatch(/#root[\s\S]*overflow-y:\s*visible/);
    expect(indexCss).toMatch(
      /html\.app-scroll-locked,\s*body\.app-scroll-locked[\s\S]*overflow:\s*hidden/
    );
  });

  it('keeps compact breakpoint tokens aligned with AppShell CSS', () => {
    expect(layoutTokensCss).toContain('--app-compact-chrome-height');
    expect(layoutTokensCss).toContain('--app-compact-content-offset-top');
    expect(COMPACT_MEDIA_QUERY).toBe('(max-width: 900px)');
    expect(appShellCss).toContain('@media (max-width: 1024px)');
  });

  it('reserves right-side alarm lanes only for expanded EMS checklists, crisis actions, and toasts', () => {
    expect(appShellCss).toContain('--ed-right-alarm-lane-width');
    expect(appShellCss).toContain('--ed-crisis-action-panel-width');
    expect(emsCriticalBroadcastCss).toMatch(
      /\.ems-critical-banner\s*\{[\s\S]*inset-inline:\s*var\(--ed-rail-width,\s*56px\)\s+var\(--ed-right-alarm-lane-width,\s*360px\)/
    );
    expect(emsCriticalBroadcastCss).toContain('.ems-critical-banner--collapsed');
    expect(emsCriticalBroadcastJsx).toContain('ems-critical-checklist--expanded');
    expect(emsCriticalBroadcastCss).toMatch(
      /\.ems-critical-checklist\s*\{[\s\S]*width:\s*var\(--ed-right-alarm-lane-width/
    );
    expect(crisisModeCss).toContain('.ed-os-shell:has(.ems-critical-checklist--expanded) .crisis-action-panel');
    expect(appShellCss).toContain('.ed-os-shell:has(.ems-critical-checklist--expanded) .ed-whiteboard__detail-overlay');
    expect(appShellCss).toContain('.ed-os-shell:has(.ems-critical-checklist--expanded) .ed-alert-toast-stack');
  });

  it('provides a WCAG bypass link and programmatic main focus target', () => {
    expect(appShellJsx).toContain('href="#main-content"');
    expect(appShellJsx).toContain('Skip to main content');
    expect(appShellJsx).toContain('tabIndex={-1}');
    expect(appShellCss).toMatch(/\.ed-skip-link[\s\S]*transform:\s*translateY/);
    expect(appShellCss).toMatch(/\.ed-skip-link:focus[\s\S]*outline:\s*2px solid/);
  });

  it('keeps shell recovery paths tolerant of partial browser and patient state', () => {
    expect(appShellJsx).toContain('function hasSeenChargeNursePulseDefault()');
    expect(appShellJsx).toContain('window.sessionStorage');
    expect(appShellJsx).toContain('Array.isArray(patient?.timeline)');
  });

  it('keeps required authenticated page roots from nesting main landmarks', () => {
    const requiredRouteFiles = [
      '../pages/CommandDashboard.jsx',
      '../pages/Operations.jsx',
      '../pages/Profile.jsx',
      '../pages/HospitalMapDashboard.jsx',
      '../pages/MedicalIotDashboard.jsx',
      '../pages/DeviceFleetManagement.jsx',
      '../pages/LiveTrackingMap.jsx',
      '../pages/DigitalTwinIntelligence.jsx',
      '../pages/SimulationScenarioPlayer.jsx',
      '../pages/LaboratoryDashboard.jsx',
      '../pages/Medical3DViewer.jsx',
      '../pages/profile/ProfileActivity.jsx',
      '../pages/profile/ProfilePreferences.jsx',
      '../pages/profile/ProfileSecurity.jsx',
      '../pages/profile/ProfileToolPreferences.jsx',
      '../pages/profile/ProfileWorkspaces.jsx',
      '../pages/Artifacts.jsx',
      '../pages/RecommendationsPage.jsx',
      '../pages/platform/PlatformSystemPage.jsx',
      '../pages/settings/FeatureManagement.jsx',
      '../pages/emergency/shift/index.tsx',
    ];

    for (const file of requiredRouteFiles) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      expect(source, file).not.toContain('<main');
      expect(source, file).not.toContain('</main>');
    }
  });
});
