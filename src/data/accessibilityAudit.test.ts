import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildAccessibilityAudit, formatAccessibilityReportMarkdown } from './accessibilityAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(join(__dirname, relativePath), 'utf8');
}

function buildCurrentSourceSnapshot() {
  return {
    appShellJsx: readSource('../components/AppShell.tsx'),
    sidebarTsx: readSource('../components/Sidebar.tsx'),
    sidebarCss: readSource('../components/Sidebar.css'),
    notificationPanelTsx: readSource('../components/SidebarNotificationPanel.tsx'),
    appShellCss: readSource('../components/app-shell.css'),
    themeSurfacesCss: readSource('../styles/theme-surfaces.css'),
    themeTokensCss: readSource('../styles/theme-tokens.css'),
    designTokensCss: readSource('../styles/design-tokens.css'),
    responsiveUxCss: readSource('../styles/responsive-ux.css'),
  };
}

describe('Accessibility audit — WCAG AA contracts', () => {
  it('passes shared keyboard, screen reader, contrast, focus, tab order, and touch target checks', () => {
    const audit = buildAccessibilityAudit(buildCurrentSourceSnapshot());

    expect(audit.target).toBe('WCAG AA');
    expect(audit.status).toBe('pass');
    expect(audit.score).toBe(100);
    expect(audit.findings).toEqual([]);
    expect(audit.checks.every((check) => check.passed)).toBe(true);
  });

  it('generates a markdown accessibility report from the audit results', () => {
    const report = formatAccessibilityReportMarkdown(buildAccessibilityAudit(buildCurrentSourceSnapshot()));

    expect(report).toContain('# Accessibility Report');
    expect(report).toContain('Target: WCAG AA');
    expect(report).toContain('Score: 100/100');
    expect(report).toContain('No open findings');
  });
});
