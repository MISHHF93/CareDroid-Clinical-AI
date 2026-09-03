import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const layoutEngineCss = readFileSync(join(__dirname, 'layout-engine.css'), 'utf8');
const visualResponsiveCss = readFileSync(
  join(__dirname, 'visual-responsive-standards.css'),
  'utf8',
);
const visualConsistencyCss = readFileSync(join(__dirname, 'visual-consistency.css'), 'utf8');

// HEAL-216: --app-layout-content-max (layout-engine.css) and
// --app-visual-page-max (visual-responsive-standards.css) are two
// independent max-width systems with different, non-overlapping direct
// consumers (.app-shell-main-content vs. named page-shell classes like
// .emergency-settings/.emergency-analytics/.cd-page-shell) -- HEAL-210
// fixed the former's ultrawide breakpoints but not the latter, so any page
// using a page-shell class instead of the main-content wrapper kept the
// exact "doesn't expand to full screen" bug HEAL-210 was meant to close.
// This pins both systems to the same values at every shared breakpoint so
// they can't drift apart silently again.
describe('ultrawide content-max consistency across the two independent max-width systems (HEAL-216)', () => {
  const breakpoints: Array<[minWidth: number, expectedMax: number]> = [
    [2200, 1960],
    [2560, 2260],
    [3440, 2980],
    [3840, 3320],
  ];

  it.each(breakpoints)(
    '--app-layout-content-max and --app-visual-page-max both resolve to %ipx-capped values at min-width: %ipx',
    (minWidth, expectedMax) => {
      const layoutBlock = layoutEngineCss.slice(
        layoutEngineCss.indexOf(`@media (min-width: ${minWidth}px)`),
      );
      const layoutMatch = layoutBlock.match(/--app-layout-content-max:\s*min\(100%,\s*(\d+)px\)/);
      expect(
        layoutMatch,
        `layout-engine.css has no rule at min-width: ${minWidth}px`,
      ).not.toBeNull();
      expect(Number(layoutMatch![1])).toBe(expectedMax);

      const visualBlock = visualResponsiveCss.slice(
        visualResponsiveCss.indexOf(`@media (min-width: ${minWidth}px)`),
      );
      const visualMatch = visualBlock.match(/--app-visual-page-max:\s*min\(100%,\s*(\d+)px\)/);
      expect(
        visualMatch,
        `visual-responsive-standards.css has no --app-visual-page-max rule at min-width: ${minWidth}px`,
      ).not.toBeNull();
      expect(Number(visualMatch![1])).toBe(expectedMax);
    },
  );

  it('visual-consistency.css no longer redeclares --app-visual-page-max (was always shadowed, dead code)', () => {
    expect(visualConsistencyCss).not.toMatch(
      /--app-visual-page-max:\s*var\(--app-fluid-container-max-wide\)/,
    );
  });
});
