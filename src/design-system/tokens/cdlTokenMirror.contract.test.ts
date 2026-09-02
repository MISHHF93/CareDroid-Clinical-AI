import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CDL_SPACING_PX, CDL_CARD_DIMENSIONS } from './spacing';
import { CDL_FONT_FAMILY, CDL_FONT_SIZE_PX, CDL_FONT_WEIGHT } from './typography';
import { CDL_RADIUS_PX } from './radius';
import { CDL_DURATION_MS } from './motion';
import { CDL_SEMANTIC_TONES } from './colors';
import { CDL_ELEVATION_STEPS } from './elevations';
import { CDL_ICON_SIZE_PX, CDL_ICON_STROKE_WIDTH } from './icons';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cdlV2Dir = join(__dirname, '../../styles/cdl-v2');
const tokensCss = readFileSync(join(cdlV2Dir, 'tokens.css'), 'utf8');
const themeCss = readFileSync(join(cdlV2Dir, 'theme.css'), 'utf8');
const cardsCss = readFileSync(join(cdlV2Dir, 'cards.css'), 'utf8');

/**
 * These tests keep the TS token mirror in src/design-system/tokens/ honest
 * against the real CSS source of truth. If tokens.css changes a value
 * without updating the TS mirror (or vice versa), this fails loudly instead
 * of silently drifting — same discipline as theme.contract.test.ts.
 */
describe('CEDS token mirror stays in sync with cdl-v2 CSS', () => {
  it('every spacing step in the TS mirror matches its --cdl-space-* declaration', () => {
    for (const [step, px] of Object.entries(CDL_SPACING_PX)) {
      const suffix = step.replace('.', '-');
      const expected = px === 0 ? '0' : `${px}px`;
      expect(tokensCss, `--cdl-space-${suffix}`).toMatch(
        new RegExp(`--cdl-space-${suffix}:\\s*${expected}`),
      );
    }
  });

  it('every font-size step in the TS mirror matches its --cdl-text-* declaration', () => {
    for (const [step, px] of Object.entries(CDL_FONT_SIZE_PX)) {
      expect(tokensCss, `--cdl-text-${step}`).toMatch(new RegExp(`--cdl-text-${step}:\\s*${px}px`));
    }
  });

  it('every font-weight in the TS mirror matches its --cdl-font-* declaration', () => {
    for (const [name, weight] of Object.entries(CDL_FONT_WEIGHT)) {
      expect(tokensCss, `--cdl-font-${name}`).toMatch(new RegExp(`--cdl-font-${name}:\\s*${weight}`));
    }
  });

  it('every radius step in the TS mirror matches its --cdl-radius-* declaration', () => {
    for (const [step, px] of Object.entries(CDL_RADIUS_PX)) {
      const expected = step === 'full' ? '9999px' : `${px}px`;
      expect(tokensCss, `--cdl-radius-${step}`).toMatch(new RegExp(`--cdl-radius-${step}:\\s*${expected}`));
    }
  });

  it('every duration step in the TS mirror matches its --cdl-duration-* declaration', () => {
    for (const [step, ms] of Object.entries(CDL_DURATION_MS)) {
      expect(tokensCss, `--cdl-duration-${step}`).toMatch(new RegExp(`--cdl-duration-${step}:\\s*${ms}ms`));
    }
  });

  it('every elevation step in the TS mirror is declared in tokens.css', () => {
    for (const step of CDL_ELEVATION_STEPS) {
      expect(tokensCss, `--cdl-elev-${step}`).toMatch(new RegExp(`--cdl-elev-${step}:\\s*\\S`));
    }
  });

  it('every elevation step above 0 gets its own dark-theme shadow', () => {
    // elevations.ts promises components that cdlElevationVar() gives dark mode a
    // stronger, non-tinted shadow set automatically. That only holds while
    // theme.css redeclares each step; a new step added to tokens.css alone would
    // silently fall back to the light shadow in dark mode. Step 0 is `none`, so
    // it needs no dark variant.
    const darkBlock = themeCss.slice(themeCss.indexOf("html[data-theme='dark']"));
    for (const step of CDL_ELEVATION_STEPS) {
      if (step === 0) continue;
      expect(darkBlock, `dark --cdl-elev-${step}`).toContain(`--cdl-elev-${step}:`);
    }
  });

  it('every icon size in the TS mirror matches its --cdl-icon-* declaration', () => {
    for (const [step, px] of Object.entries(CDL_ICON_SIZE_PX)) {
      expect(tokensCss, `--cdl-icon-${step}`).toMatch(new RegExp(`--cdl-icon-${step}:\\s*${px}px`));
    }
    expect(tokensCss, '--cdl-icon-stroke').toMatch(
      new RegExp(`--cdl-icon-stroke:\\s*${CDL_ICON_STROKE_WIDTH}`),
    );
  });

  it('every semantic tone in CDL_SEMANTIC_TONES has both a light and dark declaration in theme.css', () => {
    const lightBlock = themeCss.slice(0, themeCss.indexOf("html[data-theme='dark']"));
    const darkBlock = themeCss.slice(themeCss.indexOf("html[data-theme='dark']"));
    for (const tone of CDL_SEMANTIC_TONES) {
      if (tone === 'neutral') continue; // neutral aliases surface/border tokens, not its own hue
      expect(lightBlock, `light --cdl-${tone}`).toContain(`--cdl-${tone}:`);
      expect(darkBlock, `dark --cdl-${tone}`).toContain(`--cdl-${tone}:`);
    }
  });

  it('the standardized card dimension tokens exist in tokens.css and back a real .cdl-card--workflow rule', () => {
    expect(tokensCss).toMatch(new RegExp(`--cdl-card-min-width:\\s*${CDL_CARD_DIMENSIONS.minWidthPx}px`));
    expect(tokensCss).toMatch(new RegExp(`--cdl-card-max-width:\\s*${CDL_CARD_DIMENSIONS.maxWidthPx}px`));
    expect(tokensCss).toMatch(new RegExp(`--cdl-card-min-height:\\s*${CDL_CARD_DIMENSIONS.minHeightPx}px`));
    expect(cardsCss).toContain('.cdl-card--workflow');
    expect(cardsCss).toContain('min-width: var(--cdl-card-min-width)');
  });

  // The three assertions above covered width/height only, which let the radius and
  // padding halves of the same object drift (radiusMinPx read 12 while the CSS said
  // 14px). Assert every numeric field so a partial guard can't imply a whole one.
  it('every card padding and radius value in the TS mirror matches tokens.css', () => {
    const cardTokenByField = {
      paddingMinPx: '--cdl-card-padding-min',
      paddingMaxPx: '--cdl-card-padding-max',
      radiusMinPx: '--cdl-card-radius-min',
      radiusMaxPx: '--cdl-card-radius-max',
    } as const;

    for (const [field, cssName] of Object.entries(cardTokenByField)) {
      const px = CDL_CARD_DIMENSIONS[field as keyof typeof cardTokenByField];
      expect(tokensCss, `${cssName} vs CDL_CARD_DIMENSIONS.${field}`).toMatch(
        new RegExp(`${cssName}:\\s*${px}px`),
      );
    }
  });

  it('the TS font stacks match the --cdl-font-* declarations', () => {
    // tokens.css wraps the sans stack across lines; compare on collapsed whitespace.
    const collapsedCss = tokensCss.replace(/\s+/g, ' ');
    for (const [key, cssName] of [
      ['sans', '--cdl-font-sans'],
      ['mono', '--cdl-font-mono'],
    ] as const) {
      const stack = CDL_FONT_FAMILY[key];
      if (!stack) continue;
      expect(collapsedCss, cssName).toContain(`${cssName}: ${stack.replace(/\s+/g, ' ')};`);
    }
  });
});
