import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

describe('visual upgrade waves V3–V4', () => {
  it('emergency route metrics use semantic tones not raw hex colors', () => {
    const pages = readFileSync(join(root, 'pages/emergency/emergencyRoutePages.tsx'), 'utf8');
    expect(pages).not.toMatch(/color:\s*'#EF4444'/i);
    expect(pages).not.toMatch(/color:\s*'#F59E0B'/i);
    expect(pages).not.toMatch(/color:\s*'#10B981'/i);
    expect(pages).not.toMatch(/color:\s*'#F97316'/i);
    expect(pages).toMatch(/tone:\s*'critical'|tone:\s*[^,]+\?\s*'critical'/);
    expect(pages).toMatch(/tone:\s*'warning'|tone:\s*[^,]+\?\s*'warning'/);
    expect(pages).toMatch(/tone:\s*'success'|tone:\s*[^,]+\?\s*'success'/);
    expect(pages).toContain("tone: 'info'");
  });

  it('MetricGrid maps hex fallbacks to tones', () => {
    const shared = readFileSync(join(root, 'pages/emergency/emergencyRouteShared.tsx'), 'utf8');
    expect(shared).toContain('resolveMetricTone');
    expect(shared).toContain('EF4444');
  });

  it('top emergency CSS files avoid pale grey hex', () => {
    const files = [
      'pages/emergency/emergency-whiteboard-cleanup.css',
      'pages/ClinicalAlertsPage.css',
      'components/Header.css',
      'components/Sidebar.css',
    ];
    for (const rel of files) {
      const css = readFileSync(join(root, rel), 'utf8');
      expect(css, rel).not.toContain('#9ca3af');
    }
  });
});

describe('patient-card pill AA contract', () => {
  it('loads CDL pills stylesheet from package index and re-asserts after design-system', () => {
    const index = readFileSync(join(__dirname, 'index.css'), 'utf8');
    const main = readFileSync(join(root, 'main.tsx'), 'utf8');
    expect(index).toContain("pills.css");
    expect(main).toContain("cdl-v2/pills.css");
    // pills.css appears after design-system so dual-mode tokens win
    expect(main.indexOf('design-system.css')).toBeLessThan(main.lastIndexOf('cdl-v2/pills.css'));
  });

  it('pills.css defines dual-mode pill tokens for light and dark', () => {
    const pills = readFileSync(join(__dirname, 'pills.css'), 'utf8');
    expect(pills).toContain("html[data-theme='light']");
    expect(pills).toContain("html[data-theme='dark']");
    expect(pills).toContain('--cdl-pill-critical-fg');
    expect(pills).toContain('--cdl-pill-critical-bg');
    // Light uses dark red text; dark uses light red text
    expect(pills).toMatch(/--cdl-pill-critical-fg:\s*#991b1b/);
    expect(pills).toMatch(/html\[data-theme='dark'\][\s\S]*--cdl-pill-critical-fg:\s*#fecaca/);
    for (const tone of ['critical', 'warning', 'info', 'ok', 'ops', 'neutral']) {
      expect(pills).toContain(`data-tone='${tone}'`);
    }
  });

  it('does not blanket-force white text on all pills', () => {
    const contrast = readFileSync(join(root, 'styles/card-contrast-normalization.css'), 'utf8');
    expect(contrast).not.toMatch(/\[class\*='pill'\]:not\(\[class\*='--warn'\]\)/);
    expect(contrast).toContain("data-pill-fill='solid'");
  });

  it('PatientCard maps signals/flags with data-tone and dual-mode pairs', () => {
    const tsx = readFileSync(join(root, 'components/PatientCard.tsx'), 'utf8');
    const css = readFileSync(join(root, 'components/PatientCard.css'), 'utf8');
    expect(tsx).toContain('data-tone={signal.tone}');
    expect(tsx).toContain('resolveFlagTone');
    expect(tsx).toContain("data-tone={tone}");
    expect(css).toContain('--cdl-pill-critical-fg');
    expect(css).toContain('--cdl-pill-neutral-fg');
    expect(css).not.toMatch(/\.patient-card__signal--critical[\s\S]{0,120}color:\s*var\(--status-/);
    expect(css).not.toMatch(/\.patient-card__state-pill[\s\S]{0,200}color:\s*var\(--app-on-solid\)/);
  });

  it('card-surface badges avoid hard-coded light-only #fecaca without dual tokens', () => {
    const files = [
      'components/waiting-room/LwbsRiskBadge.css',
      'components/waiting-room/FitToWaitBadge.css',
      'components/waiting-room/DeteriorationWatchBadge.css',
      'components/triage/TriageBreachBadge.css',
      'components/queues/QueueReasonBadge.css',
      'components/reception/HighRiskComplaintFlagBadge.css',
      'components/guidance/WhatHappensNextBadge.css',
    ];
    for (const rel of files) {
      const css = readFileSync(join(root, rel), 'utf8');
      expect(css, rel).not.toMatch(/color:\s*#fecaca/i);
      expect(css, rel).toContain('--cdl-critical-text');
    }
  });
});

describe('Profile page migrated to cdl-v2 (Cycle 150)', () => {
  const profileCss = readFileSync(join(root, 'pages/Profile.css'), 'utf8');

  it('uses cdl-v2 tokens, not the legacy --medical-*/--app-*/--surface-* family', () => {
    expect(profileCss).toMatch(/--cdl-/);
    expect(profileCss).not.toMatch(/--medical-|--app-desktop-page-padding|--app-mobile-page-padding|--app-fg-muted|--surface-1|--surface-2|--panel-border|--panel-background|--semantic-attention|--text-color|--text-muted/);
  });

  it('has no hardcoded hex/rgba color literals left over from the legacy slate accent', () => {
    expect(profileCss).not.toMatch(/#374151|#b45309|#b91c1c|#fffbeb/i);
  });

  it('links and CTAs use the semantic info tone instead of a flat neutral slate', () => {
    expect(profileCss).toContain('var(--cdl-info-text)');
  });
});

describe('Profile sub-pages migrated to cdl-v2 (Cycle 151)', () => {
  const identityPagesCss = readFileSync(join(root, 'pages/profile/ProfileIdentityPages.css'), 'utf8');
  const settingsCss = readFileSync(join(root, 'pages/ProfileSettings.css'), 'utf8');

  it('ProfileIdentityPages.css (shared by Preferences/Tools/Workspaces/Security/Activity) uses cdl-v2 tokens only', () => {
    expect(identityPagesCss).toMatch(/--cdl-/);
    expect(identityPagesCss).not.toMatch(/--app-fg-muted|--panel-border|--panel-background|--card-background|--text-color|#374151|#07120d/);
  });

  it('fixes the illegible .profile-identity-button (near-black text on dark-slate background)', () => {
    expect(identityPagesCss).not.toMatch(/#07120d/);
    const buttonRule = identityPagesCss.slice(identityPagesCss.indexOf('.profile-identity-button {'));
    expect(buttonRule).toContain('background: var(--cdl-info)');
    expect(buttonRule).toContain('color: var(--cdl-ink-inverse)');
  });

  it('ProfileSettings.css uses cdl-v2 for its one color-bearing rule', () => {
    expect(settingsCss).not.toMatch(/#374151/);
    expect(settingsCss).toContain('var(--cdl-info-text)');
  });
});

describe('KPI/button tone data reaches the displayed value, not just the border (Cycle 152)', () => {
  it('DashboardVisualizations.css: --good/--warning/--critical strong text is recolored, not just the border', () => {
    const css = readFileSync(join(root, 'components/dashboard/DashboardVisualizations.css'), 'utf8');
    expect(css).toContain('.dashboard-metric-card--good strong');
    expect(css).toContain('.dashboard-status-card--good strong');
    expect(css.slice(css.indexOf('.dashboard-metric-card--good strong'))).toContain('color: var(--app-success)');
    expect(css).toContain('.dashboard-metric-card--warning strong');
    expect(css.slice(css.indexOf('.dashboard-metric-card--warning strong'))).toContain('color: var(--app-warning)');
    expect(css).toContain('.dashboard-metric-card--critical strong');
    expect(css.slice(css.indexOf('.dashboard-metric-card--critical strong'))).toContain('color: var(--app-danger)');
  });

  it('TriageBreachBadge.css: critical/watch strip counts recolor the number, not just the border', () => {
    const css = readFileSync(join(root, 'components/triage/TriageBreachBadge.css'), 'utf8');
    expect(css).toContain("[data-tone='critical'] strong");
    expect(css.slice(css.indexOf("[data-tone='critical'] strong"))).toContain('--cdl-critical-text');
    expect(css).toContain("[data-tone='watch'] strong");
    expect(css.slice(css.indexOf("[data-tone='watch'] strong"))).toContain('--cdl-warning-text');
  });

  it('caredroid-design-language.css: Hospital Command Center metric value recolors per tone', () => {
    const css = readFileSync(join(root, 'styles/caredroid-design-language.css'), 'utf8');
    expect(css).toContain(
      '.hospital-command-center__metric-card--critical .hospital-command-center__metric-value',
    );
    expect(css).toContain(
      '.hospital-command-center__metric-card--warning .hospital-command-center__metric-value',
    );
    expect(css).toContain(
      '.hospital-command-center__metric-card--watch .hospital-command-center__metric-value',
    );
    expect(css).toContain('color: var(--semantic-critical)');
    expect(css).toContain('color: var(--semantic-warning)');
    expect(css).toContain('color: var(--semantic-operational-status)');
  });

  it('button.css: .btn-danger/.btn-success use --app-on-solid, not the same-hue -contrast tokens', () => {
    const css = readFileSync(join(root, 'components/ui/button.css'), 'utf8');
    const dangerRule = css.slice(css.indexOf('.btn-danger {'), css.indexOf('.btn-danger:hover'));
    const successRule = css.slice(css.indexOf('.btn-success {'), css.indexOf('.btn-success:hover'));
    expect(dangerRule).toContain('color: var(--app-on-solid)');
    expect(dangerRule).not.toContain('--app-danger-contrast');
    expect(successRule).toContain('color: var(--app-on-solid)');
    expect(successRule).not.toContain('--app-success-contrast');
  });

  it('theme-surfaces.css: the global !important .btn-danger override does not reintroduce the same-hue invisible-text bug', () => {
    // Found during computed-style verification of the button.css fix above: this
    // unconditional, un-themed !important rule was silently neutralizing it for
    // every .btn-danger in the app (proven via getComputedStyle, not assumed).
    const css = readFileSync(join(root, 'styles/theme-surfaces.css'), 'utf8');
    const rule = css.slice(
      css.indexOf(':where(.btn-danger, .btn-remove-med:hover, .lab-value-remove:hover)'),
      css.indexOf(':where(.medication-input'),
    );
    expect(rule).toContain('color: var(--app-on-solid) !important');
    expect(rule).not.toContain('--app-danger-contrast');
  });
});

describe('Reception "Waiting list" row layout (Cycle 155)', () => {
  it('groups the risk chip and status on one flex row instead of relying on broken 2-column grid auto-placement', () => {
    // The old markup gave chip/status/wait no explicit grid placement inside a
    // 2-col/2-row grid whose only positioned child (__who) spanned both
    // columns — auto-placement scattered the remaining 3 items across
    // mismatched rows/columns, leaving the wait time floating alone,
    // disconnected from its row, unaligned. Visually confirmed via live
    // dev-server screenshot before and after.
    const css = readFileSync(join(root, 'pages/emergency/ReceptionWorkspace.css'), 'utf8');
    expect(css).toContain('.reception-queue-row__meta {');
    const metaRule = css.slice(css.indexOf('.reception-queue-row__meta {'));
    expect(metaRule).toContain('display: flex');
  });

  it('formats long waits as hours+minutes instead of a raw 3-digit minute count', () => {
    const tsx = readFileSync(join(root, 'components/reception/ReceptionOperationalRail.tsx'), 'utf8');
    expect(tsx).toContain('function formatWaitDisplay');
    expect(tsx).toMatch(/formatWaitDisplay\(waitMinutes\(patient\)\)/);
  });

  it('truncated complaint and status text carry a title tooltip with the full value', () => {
    const tsx = readFileSync(join(root, 'components/reception/ReceptionOperationalRail.tsx'), 'utf8');
    const whoBlock = tsx.slice(tsx.indexOf('reception-queue-row__who'), tsx.indexOf('reception-queue-row__meta'));
    expect(whoBlock).toContain('title={patient.chiefComplaint');
    const statusBlock = tsx.slice(tsx.indexOf('reception-queue-row__status'));
    expect(statusBlock.slice(0, 120)).toContain('title={queueStatus(patient)}');
  });
});
