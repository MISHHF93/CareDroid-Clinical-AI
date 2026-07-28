import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    expect(sweepRule).toContain(':not(.fj-critical-banner__cta)');
  });

  it('text-normalization.css excludes fj-critical-banner__cta from the plain <a> link-color rule', () => {
    const plainLinkRule = textNormalizationCss.match(
      /:is\(\.app-shell, \.emergency-app-shell\) a:not\(\[class\*='btn'\][\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(plainLinkRule).toBeDefined();
    expect(plainLinkRule).toContain(':not(.fj-critical-banner__cta)');
  });

  it('text-normalization.css excludes fj-critical-banner__cta from the __cta-specific link-color rule', () => {
    const ctaRule = textNormalizationCss.match(
      /\[class\*='__link'\][\s\S]*?\{[\s\S]*?\}/,
    )?.[0];
    expect(ctaRule).toBeDefined();
    expect(ctaRule).toContain(':not(.fj-critical-banner__cta)');
  });

  it('FullJourneyOperatingPage.css still declares the intended white-on-red styling (unchanged)', () => {
    expect(fjCss).toContain(
      "background: var(--medical-text-status-critical, #b91c1c);\n  color: #fff;",
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
    expect(sweepRule).toContain(':not(.profile-copilot-card__cta)');
  });

  it('profile-surface-normalization.css still declares the intended light-muted-surface styling (unchanged)', () => {
    expect(profileSurfaceNormCss).toContain(
      '.profile-copilot-card__cta {\n  color: var(--medical-text-link, var(--app-link-fg));\n  border-color: var(--medical-card-border, var(--app-border));\n  background: var(--medical-card-muted-bg, var(--app-surface-muted));\n}',
    );
  });
});
