import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Prettier line-wraps long `:not(...)` exclusion chains across multiple
// lines once a selector list gets long enough — that's a pure formatting
// change, not a semantic one, but it breaks a literal-substring
// `.toContain(':not(.foo)')` check the moment the wrap point lands inside
// the parens. Stripping whitespace before comparing checks the real
// invariant (the exclusion clause exists) instead of its incidental layout.
const flattenCss = (value: string | undefined): string => (value ?? '').replace(/\s+/g, '');

const colorNormalizationCss = readFileSync(join(__dirname, 'color-normalization.css'), 'utf8');
const textNormalizationCss = readFileSync(join(__dirname, 'text-normalization.css'), 'utf8');
const fjCss = readFileSync(
  join(__dirname, '../pages/emergency/FullJourneyOperatingPage.css'),
  'utf8',
);

describe('fj-critical-banner__cta contrast (Cycle 207)', () => {
  // Regression guard for a real ~1.4:1 contrast failure (WCAG AA needs 4.5:1)
  // on the "Acknowledge" critical-alert action: two app-wide CSS sweeps target
  // any element whose class contains "cta", overriding this button's own
  // deliberate white-on-red styling with a dark-navy background and a
  // near-invisible teal link color. All three matching rules need the
  // exclusion, or the other two silently repaint it again.

  it('color-normalization.css excludes fj-critical-banner__cta from the dark-navy CTA sweep', () => {
    const sweepRule = colorNormalizationCss.match(
      /\[class\*='cta'\]\s*\):[\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(sweepRule).toBeDefined();
    expect(flattenCss(sweepRule)).toContain(':not(.fj-critical-banner__cta)');
  });

  it('text-normalization.css excludes fj-critical-banner__cta from the plain <a> link-color rule', () => {
    const plainLinkRule = textNormalizationCss.match(
      /:is\(\.app-shell, \.emergency-app-shell\)\s*a:not\(\[class\*='btn'\][\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(plainLinkRule).toBeDefined();
    expect(flattenCss(plainLinkRule)).toContain(':not(.fj-critical-banner__cta)');
  });

  it('text-normalization.css excludes fj-critical-banner__cta from the __cta-specific link-color rule', () => {
    const ctaRule = textNormalizationCss.match(/\[class\*='__link'\][\s\S]*?\{[\s\S]*?\}/)?.[0];
    expect(ctaRule).toBeDefined();
    expect(flattenCss(ctaRule)).toContain(':not(.fj-critical-banner__cta)');
  });

  it('FullJourneyOperatingPage.css still declares the intended white-on-red styling (unchanged)', () => {
    // --medical-text-status-critical (word order swapped) doesn't exist -- fixed to the
    // real --medical-status-critical-text, same #b91c1c light-mode fallback, now
    // theme-aware in dark mode via medical-type-layer.css's new dark override.
    expect(fjCss).toContain(
      'background: var(--medical-status-critical-text, #b91c1c);\n  color: #fff;',
    );
  });
});

const receptionJobProfileCardCss = readFileSync(
  join(__dirname, '../components/profile/ReceptionJobProfileCard.css'),
  'utf8',
);
const receptionSkillStripCss = readFileSync(
  join(__dirname, '../components/reception/ReceptionSkillStrip.css'),
  'utf8',
);

describe('reception-job-profile-card__cta and reception-skill-strip__cta contrast (Cycle 213)', () => {
  // Regression guard for the same sweep-rule footgun a third time, found once
  // the dist-staleness blocker that left these 2 candidates "unverified" in
  // Cycles 207-208 was worked around with a real-CSS-cascade browser harness
  // (dist/ predates these components entirely — added 2026-07-24, 5 days
  // after dist's last build). Measured live at ~1.02:1 (worse than the two
  // cases above): color-normalization.css's [class*='cta'] sweep repaints the
  // background #374151, and text-normalization.css's __cta rule (plus, for
  // the <a>-rendered job-profile-card variant, the plain-anchor rule too)
  // repaints the text to --medical-text-link, which under the reception
  // role-accent theme resolves to a near-black navy almost the same as the
  // sweep's own background.

  it('color-normalization.css excludes both reception CTAs from the dark-navy CTA sweep', () => {
    const sweepRule = colorNormalizationCss.match(
      /\[class\*='cta'\]\s*\):[\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(sweepRule).toBeDefined();
    expect(flattenCss(sweepRule)).toContain(':not(.reception-job-profile-card__cta)');
    expect(flattenCss(sweepRule)).toContain(':not(.reception-skill-strip__cta)');
  });

  it('text-normalization.css excludes reception-job-profile-card__cta from the plain <a> link-color rule', () => {
    const plainLinkRule = textNormalizationCss.match(
      /:is\(\.app-shell, \.emergency-app-shell\)\s*a:not\(\[class\*='btn'\][\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(plainLinkRule).toBeDefined();
    expect(flattenCss(plainLinkRule)).toContain(':not(.reception-job-profile-card__cta)');
  });

  it('text-normalization.css excludes both reception CTAs from the __cta-specific link-color rule', () => {
    const ctaRule = textNormalizationCss.match(/\[class\*='__link'\][\s\S]*?\{[\s\S]*?\}/)?.[0];
    expect(ctaRule).toBeDefined();
    expect(flattenCss(ctaRule)).toContain(':not(.reception-job-profile-card__cta)');
    expect(flattenCss(ctaRule)).toContain(':not(.reception-skill-strip__cta)');
  });

  it('ReceptionJobProfileCard.css uses a fixed, theme-constant WCAG-AA-safe background (7.56:1 with white text)', () => {
    expect(receptionJobProfileCardCss).toContain('background: #075985;');
    expect(receptionJobProfileCardCss).not.toContain('background: var(--cdl-brand-600');
  });

  it('ReceptionSkillStrip.css uses a fixed, theme-constant WCAG-AA-safe background for its default tone (unaffected by the --critical override, still #dc2626 fallback)', () => {
    expect(receptionSkillStripCss).toContain('background: #075985;');
    // --cdl-danger-600 doesn't exist in the cdl-v2 design system (the tone is named
    // "critical", not "danger", with no numbered scale) -- fixed to --cdl-critical,
    // which resolves to the same #dc2626 in light mode and is theme-aware in dark mode.
    expect(receptionSkillStripCss).toContain(
      '.reception-skill-strip--critical .reception-skill-strip__cta {\n  border-color: var(--cdl-critical, #dc2626);\n  background: var(--cdl-critical, #dc2626);\n}',
    );
  });
});

const profileSurfaceNormCss = readFileSync(
  join(__dirname, 'profile-surface-normalization.css'),
  'utf8',
);

describe('profile-copilot-card__cta contrast (Cycle 208)', () => {
  // Regression guard for the same sweep-rule footgun as fj-critical-banner__cta
  // (see above), a second real instance: this button is a real <button>, not an
  // <a>, so only the [class*='cta'] background sweep applies (the plain a:not()
  // and __cta-specific text-normalization.css rules both already resolve to the
  // element's own intended --medical-text-link color, so no exclusion needed
  // there — verified live before excluding only the one rule that was wrong).

  it('color-normalization.css excludes profile-copilot-card__cta from the dark-navy CTA sweep', () => {
    const sweepRule = colorNormalizationCss.match(
      /\[class\*='cta'\]\s*\):[\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(sweepRule).toBeDefined();
    expect(flattenCss(sweepRule)).toContain(':not(.profile-copilot-card__cta)');
  });

  it('profile-surface-normalization.css still declares the intended light-muted-surface styling (unchanged)', () => {
    expect(profileSurfaceNormCss).toContain(
      '.profile-copilot-card__cta {\n  color: var(--medical-text-link, var(--app-link-fg));\n  border-color: var(--medical-card-border, var(--app-border));\n  background: var(--medical-card-muted-bg, var(--app-surface-muted));\n}',
    );
  });
});

const cdlPublicPageCss = readFileSync(join(__dirname, 'cdl-public-page.css'), 'utf8');
const profileCss = readFileSync(join(__dirname, '../pages/Profile.css'), 'utf8');
const receptionAttentionStripCss = readFileSync(
  join(__dirname, '../components/reception/ReceptionAttentionStrip.css'),
  'utf8',
);
const platformEntryHubCss = readFileSync(join(__dirname, '../pages/PlatformEntryHub.css'), 'utf8');
const receptionWorkspaceCss = readFileSync(
  join(__dirname, '../pages/emergency/ReceptionWorkspace.css'),
  'utf8',
);

describe('6 more cta-substring collisions found by sweeping every className for the bug shape (Cycle 261)', () => {
  // Same footgun as the 3 describe blocks above, found by grepping every
  // rendered className containing "cta" instead of waiting for a 4th report:
  // color-normalization.css's [class*='cta'] sweep (and, where the element
  // also matches [class*='__cta']/is a plain <a>, text-normalization.css's
  // two link-color rules) matches on substring alone, with no regard for
  // whether the element already has its own deliberate, un-!important'd
  // styling. All 6 below had zero protection before this cycle.

  it('color-normalization.css excludes all 6 newly-found ctas from the dark-navy sweep', () => {
    const sweepRule = colorNormalizationCss.match(
      /\[class\*='cta'\]\s*\):[\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(sweepRule).toBeDefined();
    const flatSweep = flattenCss(sweepRule);
    [
      '.cdl-public-page__cta',
      '.profile-section-header__cta',
      '.profile-activity-cta',
      '.reception-attention__cta',
      '.platform-entry__cta',
      '.reception-queue-row__cta',
    ].forEach((cls) => {
      expect(flatSweep).toContain(`:not(${cls})`);
    });
  });

  it('text-normalization.css excludes the 2 plain <a> instances (profile-section-header__cta, profile-activity-cta) from the plain-anchor rule', () => {
    const plainLinkRule = textNormalizationCss.match(
      /:is\(\.app-shell, \.emergency-app-shell\)\s*a:not\(\[class\*='btn'\][\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(plainLinkRule).toBeDefined();
    const flatRule = flattenCss(plainLinkRule);
    expect(flatRule).toContain(':not(.profile-section-header__cta)');
    expect(flatRule).toContain(':not(.profile-activity-cta)');
  });

  it("text-normalization.css excludes the 5 __cta-matching instances (all but profile-activity-cta, which doesn't match the __cta substring) from the __cta-specific rule", () => {
    const ctaRule = textNormalizationCss.match(/\[class\*='__link'\][\s\S]*?\{[\s\S]*?\}/)?.[0];
    expect(ctaRule).toBeDefined();
    const flatRule = flattenCss(ctaRule);
    [
      '.cdl-public-page__cta',
      '.profile-section-header__cta',
      '.reception-attention__cta',
      '.platform-entry__cta',
      '.reception-queue-row__cta',
    ].forEach((cls) => {
      expect(flatRule).toContain(`:not(${cls})`);
    });
  });

  it('each component still declares its own pre-existing, un-overridden styling (unchanged by this cycle)', () => {
    expect(cdlPublicPageCss).toContain('.cdl-public-page__cta {');
    expect(cdlPublicPageCss).toContain('background: var(--semantic-information-bg);');
    expect(profileCss).toContain('.profile-section-header__cta {');
    expect(profileCss).toContain('color: var(--cdl-info-text);');
    expect(receptionAttentionStripCss).toContain('.reception-attention__cta {');
    expect(receptionAttentionStripCss).toContain(
      'background: color-mix(in srgb, var(--cdl-ink) 8%, transparent);',
    );
    expect(platformEntryHubCss).toContain('.platform-entry__cta {');
    expect(platformEntryHubCss).toContain('color: #374151;');
    expect(receptionWorkspaceCss).toContain('.reception-queue-row__cta {');
    expect(receptionWorkspaceCss).toContain('background: var(--cdl-surface-muted, #f1f5f9);');
  });
});

const platformEntryCardCss = platformEntryHubCss;
const preparePatientChooserCss = readFileSync(
  join(__dirname, '../components/reception/PreparePatientChooser.css'),
  'utf8',
);
const entryShellCss = readFileSync(join(__dirname, '../layouts/EntryShell.css'), 'utf8');
const userAccountMenuCss = readFileSync(
  join(__dirname, '../components/account/UserAccountMenu.css'),
  'utf8',
);
const orchestrationCss = readFileSync(
  join(__dirname, '../components/orchestration/orchestration.css'),
  'utf8',
);
const workflowAutomationCommandBarCss = readFileSync(
  join(__dirname, '../components/emergency/workflow-automation-command-bar.css'),
  'utf8',
);

describe('6 more --primary-substring collisions found by auditing the other half of the same sweep rule (Cycle 266)', () => {
  // Cycle 261 audited every className matching [class*='cta']; this cycle
  // audits the other branch of the same color-normalization.css sweep,
  // [class*='--primary'], which had never been swept for this bug shape.

  it('color-normalization.css excludes all 6 newly-found --primary instances from the dark-navy sweep', () => {
    const sweepRule = colorNormalizationCss.match(
      /\[class\*='cta'\]\s*\):[\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(sweepRule).toBeDefined();
    const flatSweep = flattenCss(sweepRule);
    [
      '.platform-entry__card--primary',
      '.patient-orchestration__chip--primary',
      '.reception-prepare__option--primary',
      '.entry-shell__link--primary',
      '.account-menu__item--primary',
      '.workflow-automation-command-bar__btn--primary',
    ].forEach((cls) => {
      expect(flatSweep).toContain(`:not(${cls})`);
    });
  });

  it('text-normalization.css excludes the 2 <a>-rendered instances from the plain-anchor rule', () => {
    const plainLinkRule = textNormalizationCss.match(
      /:is\(\.app-shell, \.emergency-app-shell\)\s*a:not\(\[class\*='btn'\][\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(plainLinkRule).toBeDefined();
    const flatRule = flattenCss(plainLinkRule);
    expect(flatRule).toContain(':not(.platform-entry__card--primary)');
    expect(flatRule).toContain(':not(.entry-shell__link--primary)');
  });

  it("text-normalization.css excludes entry-shell__link--primary (matches [class*='__link']) from the __cta-specific rule", () => {
    const ctaRule = textNormalizationCss.match(/\[class\*='__link'\][\s\S]*?\{[\s\S]*?\}/)?.[0];
    expect(ctaRule).toBeDefined();
    expect(flattenCss(ctaRule)).toContain(':not(.entry-shell__link--primary)');
  });

  it('each component still declares its own pre-existing, un-overridden styling (unchanged by this cycle)', () => {
    expect(platformEntryCardCss).toContain('.platform-entry__card--primary {');
    expect(platformEntryCardCss).toContain(
      'border-color: color-mix(in srgb, #374151 25%, transparent);',
    );
    expect(orchestrationCss).toContain('.patient-orchestration__chip--primary {');
    expect(orchestrationCss).toContain('background: rgba(245, 158, 11, 0.16);');
    expect(preparePatientChooserCss).toContain('.reception-prepare__option--primary {');
    expect(preparePatientChooserCss).toContain('background: var(--cdl-info-bg, #f0f9ff);');
    expect(entryShellCss).toContain('.entry-shell__link--primary {');
    expect(entryShellCss).toContain('color: #374151;');
    expect(userAccountMenuCss).toContain('.account-menu__item--primary {');
    expect(userAccountMenuCss).toContain('font-weight: 600;');
    expect(workflowAutomationCommandBarCss).toContain(
      '.workflow-automation-command-bar__btn--primary {',
    );
    // --ed-accent doesn't exist -- fixed to the real, theme-aware --app-accent.
    expect(workflowAutomationCommandBarCss).toContain(
      'background: color-mix(in srgb, var(--app-accent, #64748b) 12%, transparent);',
    );
  });
});

const criticalAlertBannerCss = readFileSync(
  join(__dirname, '../components/emergency/CriticalAlertBanner.css'),
  'utf8',
);
const cdlAlarmCss = readFileSync(join(__dirname, 'cdl-v2/alarm.css'), 'utf8');

describe('critical-alert-banner__link contrast (Cycle 269)', () => {
  // The worst instance of this bug class found this campaign: the "View
  // alerts" action on the unacknowledged-critical-alerts banner is a
  // react-router <Link> with classNames critical-alert-banner__link
  // cdl-alarm-banner__action cdl-alarm-banner__action--primary. Its own CSS
  // (cdl-v2/alarm.css) is a solid critical-red button (--cdl-critical,
  // #dc2626 in light theme) with white text (--cdl-on-brand) for a
  // WCAG-AA-passing 4.83:1 contrast. cdl-alarm-banner__action--primary
  // matches [class*='--primary'], so color-normalization.css's dark-navy
  // sweep repaints its background to #374151; critical-alert-banner__link
  // matches [class*='__link'] (and the plain <a> rule, since it has no
  // "btn"/"button"/role="button" marker), so text-normalization.css's two
  // link-color rules repaint its white text to link-blue (--medical-text-
  // link, #0284c7). Measured: blue text on the intended red background is
  // ~1.18:1; even against the sweep's own dark-navy background it's ~2.52:1
  // — both far below WCAG AA's 4.5:1 floor, on the app's single
  // highest-severity alert action.

  it('color-normalization.css excludes critical-alert-banner__link from the dark-navy sweep', () => {
    const sweepRule = colorNormalizationCss.match(
      /\[class\*='cta'\]\s*\):[\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(sweepRule).toBeDefined();
    expect(flattenCss(sweepRule)).toContain(':not(.critical-alert-banner__link)');
  });

  it('text-normalization.css excludes critical-alert-banner__link from the plain <a> link-color rule', () => {
    const plainLinkRule = textNormalizationCss.match(
      /:is\(\.app-shell, \.emergency-app-shell\)\s*a:not\(\[class\*='btn'\][\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(plainLinkRule).toBeDefined();
    expect(flattenCss(plainLinkRule)).toContain(':not(.critical-alert-banner__link)');
  });

  it('text-normalization.css excludes critical-alert-banner__link from the __link-specific rule', () => {
    const linkRule = textNormalizationCss.match(/\[class\*='__link'\][\s\S]*?\{[\s\S]*?\}/)?.[0];
    expect(linkRule).toBeDefined();
    expect(flattenCss(linkRule)).toContain(':not(.critical-alert-banner__link)');
  });

  it('CriticalAlertBanner.css and cdl-v2/alarm.css still declare the intended solid-critical-red/white-text styling (unchanged)', () => {
    expect(criticalAlertBannerCss).toContain('.critical-alert-banner__link {');
    expect(cdlAlarmCss).toContain(
      '.cdl-alarm-banner__action--primary {\n  background: var(--cdl-brand-600);\n  border-color: var(--cdl-brand-700);\n  color: var(--cdl-on-brand);\n}',
    );
    expect(cdlAlarmCss).toContain(
      "[data-severity='critical'] .cdl-alarm-banner__action--primary {\n  background: var(--cdl-critical);\n  border-color: var(--cdl-critical-text);\n}",
    );
  });
});

const receptionTaskSheetCss = readFileSync(
  join(__dirname, '../components/reception/ReceptionPatientTaskSheet.css'),
  'utf8',
);

describe('reception-task-sheet__action--critical border-color (Cycle 269, 4th sweep family)', () => {
  // color-normalization.css has a 4th substring-sweep family, independent of
  // cta/--primary/__link: [class*='__action'] on a border-color-only rule
  // that already exempts --danger and --primary BEM modifiers but not
  // --critical. reception-task-sheet__action--critical is the "Escalate to
  // nurse" action on ReceptionPatientTaskSheet.tsx, shown with this modifier
  // only when isHighRisk is true. Its own CSS sets a deliberate red-tinted
  // border-color to visually flag the escalation as urgent; this sweep was
  // flattening it to the same neutral border as every ordinary action
  // button, silently erasing the one visual cue this button most needs.

  it("color-normalization.css excludes [class*='--critical'] from the __action/-button border-color sweep", () => {
    const sweepRule = colorNormalizationCss.match(
      /\[class\*='__action'\][\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(sweepRule).toBeDefined();
    expect(flattenCss(sweepRule)).toContain(":not([class*='--critical'])");
  });

  it('ReceptionPatientTaskSheet.css still declares the intended critical-red border styling (unchanged)', () => {
    expect(receptionTaskSheetCss).toContain(
      '.reception-task-sheet__action--critical {\n  background: var(--cdl-critical-bg);\n  border-color: var(--cdl-critical-border);\n  color: var(--cdl-critical-text);\n}',
    );
  });
});

const cardContrastCss = readFileSync(join(__dirname, 'card-contrast-normalization.css'), 'utf8');
const dispatchConsoleCss = readFileSync(
  join(__dirname, '../pages/emergency/DispatchConsole.css'),
  'utf8',
);
const dispatchConsoleTsx = readFileSync(
  join(__dirname, '../pages/emergency/DispatchConsole.tsx'),
  'utf8',
);

describe('dc-panel critical dispatch styling contrast (2026-08-07, 5th sweep family)', () => {
  // card-contrast-normalization.css had never been audited for this bug class
  // — only surface-normalization.css, color-normalization.css, and
  // text-normalization.css had exclusions for --critical/--danger/--warning
  // BEM modifiers. DispatchConsole's "Dispatch Unit Now" panel
  // (isCritical branch renders className="dc-panel dc-call-card--critical")
  // lost all 3 of its urgency cues at once: the base card-contract rule
  // matched via [class*='-panel '] and forced the panel's border-color back
  // to the plain default (silently erasing .dc-call-card--critical's red-
  // tinted border), while two typography rules matched the same
  // [class*='-panel '] ancestor and forced dc-title-14-critical's red
  // heading color and dc-critical-11's red "3-minute response target"
  // badge color back to inherited/default ink — because unlike its sibling
  // surface-normalization.css, this file's color-forcing rules had no
  // severity-modifier exclusion at all.

  const baseContractRule = cardContrastCss.slice(
    cardContrastCss.indexOf('/* Base contract for card-like surfaces'),
    cardContrastCss.indexOf('/* Severity cards own their contrast'),
  );
  const headingAndSpanRules = cardContrastCss.slice(
    cardContrastCss.indexOf('/* Typography roles inside cards'),
    cardContrastCss.indexOf('/* Light card bodies must not use on-solid text'),
  );
  const lightCardBodiesRule = cardContrastCss.slice(
    cardContrastCss.indexOf('/* Light card bodies must not use on-solid text'),
  );

  it('the base card-contract rule excludes critical/danger/warning containers from the forced background/border/color', () => {
    const flat = flattenCss(baseContractRule);
    expect(flat).toContain(":not([class*='--critical'])");
    expect(flat).toContain(":not([class*='--danger'])");
    expect(flat).toContain(":not([class*='--warning'])");
  });

  it('the heading/strong rule, the span/p rule, and the muted meta/hint/caption/subtitle rule each exclude critical/danger/warning ancestors (each needs its own exclusion, or another still repaints it)', () => {
    const flat = flattenCss(headingAndSpanRules);
    (['--critical', '--danger', '--warning'] as const).forEach((modifier) => {
      const needle = `:not([class*='${modifier}'])`;
      const occurrences = flat.split(needle).length - 1;
      expect(occurrences, `expected 3 occurrences of ${needle}`).toBe(3);
    });
  });

  it('the higher-specificity light-card-bodies rule also excludes critical/danger/warning ancestors (it would otherwise still repaint dc-critical-11 even after the span rule above is fixed)', () => {
    const flat = flattenCss(lightCardBodiesRule);
    expect(flat).toContain(":not([class*='--critical'])");
    expect(flat).toContain(":not([class*='--danger'])");
    expect(flat).toContain(":not([class*='--warning'])");
  });

  it('DispatchConsole.css still declares the intended critical-red border/title/badge styling (unchanged)', () => {
    // --medical-text-status-critical (word order swapped) doesn't exist -- fixed to the
    // real --medical-status-critical-text, same #b91c1c light-mode fallback, now
    // theme-aware in dark mode via medical-type-layer.css's new dark override.
    expect(dispatchConsoleCss).toContain(
      '.dc-call-card--critical {\n  border-color: color-mix(\n    in srgb,\n    var(--medical-status-critical-text, #b91c1c) 45%,\n    var(--medical-border)\n  );\n}',
    );
    expect(dispatchConsoleCss).toContain(
      '.dc-title-14-critical {\n  font-size: 14px;\n  font-weight: 700;\n  color: var(--medical-status-critical-text, #b91c1c);\n}',
    );
    expect(dispatchConsoleCss).toContain(
      '.dc-critical-11 {\n  font-size: 11px;\n  color: var(--medical-status-critical-text, #b91c1c);\n  font-weight: 700;\n}',
    );
  });

  it('DispatchConsole.tsx still applies dc-call-card--critical alongside dc-panel when isCritical (unchanged)', () => {
    expect(dispatchConsoleTsx).toContain(
      'className={`dc-panel ${isCritical ? "dc-call-card--critical" : ""}`}',
    );
  });
});

describe('card-contrast-normalization.css meta/hint/caption/subtitle exclusion (2026-08-08, Round 33)', () => {
  // The 5th-sweep-family fix above closed the base contract rule and the 2
  // heading/span typography rules, but left ONE sibling rule in the same
  // "Typography roles inside cards" block unexcluded: the muted
  // __meta/-meta/__subtitle/-subtitle/__hint/-hint/__caption/-caption rule
  // (it forces color: var(--card-contract-fg-muted, ...) on any matching
  // descendant of a card/panel, with no severity-modifier exclusion at all).
  // An exhaustive live-consumer sweep (every tsx file combining a -card/
  // -panel ancestor with a __meta/-meta/__subtitle/-subtitle/__hint/-hint/
  // __caption/-caption descendant) found zero current components relying on
  // this rule's muted color reaching a critical/danger/warning-flagged card
  // -- every real chip/badge that needs a critical color already either uses
  // a different class shape (e.g. __chip--critical, not __meta) or hardens
  // itself with !important. So this was a latent gap, not a live bug: the
  // 2 sibling rules already excluded --critical/--danger/--warning; this one
  // didn't, for no evident reason, leaving the door open for a future
  // component reusing __meta/__hint/__caption/__subtitle inside a critical
  // card to silently lose its urgency color the same way DispatchConsole did.
  // Closed defensively to match the pattern the file's own other 2 rules
  // already established.

  const mutedMetaRule = cardContrastCss.slice(
    cardContrastCss.indexOf('/* Muted meta/hint/caption/subtitle text inside cards */'),
    cardContrastCss.indexOf('/* Light card bodies must not use on-solid text'),
  );

  it("the muted meta/hint/caption/subtitle rule now excludes critical/danger/warning card ancestors, matching its 2 sibling rules", () => {
    const flat = flattenCss(mutedMetaRule);
    expect(flat).toContain(":not([class*='--critical'])");
    expect(flat).toContain(":not([class*='--danger'])");
    expect(flat).toContain(":not([class*='--warning'])");
  });

  it('still matches every one of the 8 original substrings (the fix only added an exclusion, it did not narrow the match)', () => {
    const flat = flattenCss(mutedMetaRule);
    [
      "[class*='__meta']",
      "[class*='-meta']",
      "[class*='__subtitle']",
      "[class*='-subtitle']",
      "[class*='__hint']",
      "[class*='-hint']",
      "[class*='__caption']",
      "[class*='-caption']",
    ].forEach((needle) => {
      expect(flat).toContain(needle);
    });
  });
});
