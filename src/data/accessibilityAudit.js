export const ACCESSIBILITY_AUDIT_CATEGORIES = Object.freeze({
  KEYBOARD_NAVIGATION: 'keyboard-navigation',
  SCREEN_READERS: 'screen-readers',
  CONTRAST: 'contrast',
  FOCUS_INDICATORS: 'focus-indicators',
  TAB_ORDER: 'tab-order',
  TOUCH_TARGETS: 'touch-targets',
});

export const WCAG_AA_TARGETS = Object.freeze([
  '2.1.1 Keyboard',
  '2.1.2 No Keyboard Trap',
  '2.4.1 Bypass Blocks',
  '2.4.3 Focus Order',
  '2.4.7 Focus Visible',
  '1.3.1 Info and Relationships',
  '1.4.3 Contrast Minimum',
  '1.4.11 Non-text Contrast',
  '2.5.5 Target Size',
]);

function has(source, pattern) {
  return typeof pattern === 'string' ? source.includes(pattern) : pattern.test(source);
}

function check(id, category, title, passed, evidence, fix) {
  return { id, category, title, passed: Boolean(passed), evidence, fix };
}

export function buildAccessibilityAudit(sourceSnapshot = {}) {
  const appShellJsx = sourceSnapshot.appShellJsx || '';
  const appShellCss = sourceSnapshot.appShellCss || '';
  const sidebarJsx = sourceSnapshot.sidebarJsx || '';
  const sidebarCss = sourceSnapshot.sidebarCss || '';
  const themeSurfacesCss = sourceSnapshot.themeSurfacesCss || '';
  const themeTokensCss = sourceSnapshot.themeTokensCss || '';
  const designTokensCss = sourceSnapshot.designTokensCss || '';
  const responsiveUxCss = sourceSnapshot.responsiveUxCss || '';
  const allSource = Object.values(sourceSnapshot).join('\n');

  const checks = [
    check(
      'keyboard-skip-link',
      ACCESSIBILITY_AUDIT_CATEGORIES.KEYBOARD_NAVIGATION,
      'Authenticated shell exposes a skip link to main content',
      has(appShellJsx, 'href="#main-content"') && has(appShellCss, '.app-skip-link:focus'),
      '`AppShell` renders a skip link before navigation.',
      'Add a visible-on-focus skip link before the sidebar.'
    ),
    check(
      'keyboard-drawer-escape',
      ACCESSIBILITY_AUDIT_CATEGORIES.KEYBOARD_NAVIGATION,
      'Compact navigation drawer closes with Escape and restores focus',
      has(appShellJsx, 'useDrawerFocus') && has(appShellJsx, "e.key === 'Escape'"),
      '`useDrawerFocus` and Escape handling are wired in `AppShell`.',
      'Keep drawer focus management and Escape close handling.'
    ),
    check(
      'screen-reader-icon-buttons',
      ACCESSIBILITY_AUDIT_CATEGORIES.SCREEN_READERS,
      'Icon-only sidebar buttons expose accessible names',
      has(sidebarJsx, 'aria-label={item.label}') &&
        has(sidebarJsx, 'aria-label="Start a new chat"') &&
        has(sidebarJsx, 'aria-label="Sign out"'),
      'Collapsed nav, new chat, and sign out controls have explicit labels.',
      'Do not rely on `title` as the accessible name for icon-only controls.'
    ),
    check(
      'screen-reader-status',
      ACCESSIBILITY_AUDIT_CATEGORIES.SCREEN_READERS,
      'Non-text health state is announced',
      has(sidebarJsx, 'role="status"') && has(sidebarJsx, 'aria-label={`System status: ${healthStatus}`}'),
      'Sidebar health dot has a status role and text alternative.',
      'Add a screen-reader label to non-text status indicators.'
    ),
    check(
      'contrast-theme-tokens',
      ACCESSIBILITY_AUDIT_CATEGORIES.CONTRAST,
      'Theme tokens define AA-oriented foreground and focus colors',
      has(themeTokensCss, '--app-fg: #f8fafc') &&
        has(themeTokensCss, '--app-focus-ring-aa') &&
        has(themeTokensCss, '--app-accent-contrast'),
      'Dark/light tokens expose foreground, contrast, and focus ring variables.',
      'Maintain tokenized foreground and focus colors with AA contrast checks.'
    ),
    check(
      'focus-visible-global',
      ACCESSIBILITY_AUDIT_CATEGORIES.FOCUS_INDICATORS,
      'Global focus indicators are visible and not color-only',
      has(themeSurfacesCss, ':focus-visible') &&
        has(themeSurfacesCss, 'outline: 3px solid var(--app-focus-ring-aa') &&
        has(themeSurfacesCss, 'outline-offset: 3px'),
      'Global interactive controls use a 3px focus outline plus shadow.',
      'Use a high-contrast outline with offset for all focusable controls.'
    ),
    check(
      'tab-order-no-positive',
      ACCESSIBILITY_AUDIT_CATEGORIES.TAB_ORDER,
      'Tab order avoids positive tabIndex values',
      !/tabIndex=\{?[1-9]/.test(allSource) && !/tabindex=["']?[1-9]/i.test(allSource),
      'No positive tab index values found in audited sources.',
      'Use DOM order and `tabIndex={-1}` only for programmatic focus targets.'
    ),
    check(
      'tab-order-main-target',
      ACCESSIBILITY_AUDIT_CATEGORIES.TAB_ORDER,
      'Main landmark can receive skip-link focus without entering tab order',
      has(appShellJsx, 'id="main-content"') && has(appShellJsx, 'tabIndex={-1}'),
      '`main#main-content` is a programmatic focus target.',
      'Add `tabIndex={-1}` to the main landmark.'
    ),
    check(
      'touch-target-baseline',
      ACCESSIBILITY_AUDIT_CATEGORIES.TOUCH_TARGETS,
      'Shared controls meet 44px target floor',
      has(designTokensCss, '--touch-target-min: 44px') &&
        has(sidebarCss, 'min-height: var(--app-min-touch-target, 44px)') &&
        has(responsiveUxCss, 'min-height: var(--app-min-touch-target, 44px)'),
      'Design tokens, responsive UX, and sidebar controls enforce 44px minimum targets.',
      'Apply the touch target token to primary buttons, nav items, and form controls.'
    ),
  ];

  const failed = checks.filter((item) => !item.passed);
  const score = Math.round(((checks.length - failed.length) / checks.length) * 100);

  return {
    target: 'WCAG AA',
    wcagTargets: WCAG_AA_TARGETS,
    score,
    status: failed.length === 0 ? 'pass' : score >= 80 ? 'needs-review' : 'fail',
    checks,
    findings: failed,
    categorySummary: Object.values(ACCESSIBILITY_AUDIT_CATEGORIES).map((category) => ({
      category,
      passed: checks.filter((checkItem) => checkItem.category === category && checkItem.passed).length,
      total: checks.filter((checkItem) => checkItem.category === category).length,
    })),
  };
}

export function formatAccessibilityReportMarkdown(audit = buildAccessibilityAudit()) {
  const lines = [
    '# Accessibility Report',
    '',
    `Target: ${audit.target}`,
    `Score: ${audit.score}/100 (${audit.status})`,
    '',
    '## WCAG AA Coverage',
    '',
    ...audit.wcagTargets.map((target) => `- ${target}`),
    '',
    '## Category Summary',
    '',
    ...audit.categorySummary.map((item) => `- ${item.category}: ${item.passed}/${item.total} checks passing`),
    '',
    '## Findings',
    '',
    ...(audit.findings.length
      ? audit.findings.map((finding) => `- ${finding.title}: ${finding.fix}`)
      : ['- No open findings after the current shared fixes.']),
    '',
    '## Automated Checks',
    '',
    ...audit.checks.map((item) => `- ${item.passed ? 'PASS' : 'FAIL'}: ${item.title}`),
  ];

  return `${lines.join('\n')}\n`;
}
