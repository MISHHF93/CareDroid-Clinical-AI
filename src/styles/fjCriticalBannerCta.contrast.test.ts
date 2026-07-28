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
