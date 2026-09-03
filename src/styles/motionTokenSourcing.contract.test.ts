import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * CareDroid carries several motion token namespaces. That is tolerable while each
 * one has a single owner; it stops being tolerable when two of them declare the
 * same scale with their own literals, because then they agree only by luck.
 *
 * Two such copies were found and single-sourced:
 *  - tokens.css declared --cd-duration-* / --cd-ease-* with the same
 *    0/80/150/250/400ms and cubic-beziers as cdl-v2/tokens.css. It now resolves
 *    from the cdl tokens.
 *  - --motion-transition-* was declared byte-identically in both primitives.css
 *    and design-tokens.css. design-tokens.css owns it now.
 *
 * These assertions exist so the next person to touch motion cannot quietly
 * re-fork either one. They check sourcing, not taste -- the namespaces
 * themselves are a separate, larger convergence.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(join(__dirname, name), 'utf8');

const tokensCss = read('tokens.css');
const primitivesCss = read('primitives.css');
const designTokensCss = read('design-tokens.css');
const cdlTokensCss = read('cdl-v2/tokens.css');

describe('motion token sourcing', () => {
  it('the --cd-* duration scale resolves from the cdl scale rather than repeating it', () => {
    for (const step of ['instant', 'fast', 'normal', 'slow', 'slower']) {
      expect(tokensCss, `--cd-duration-${step}`).toMatch(
        new RegExp(`--cd-duration-${step}:\\s*var\\(--cdl-duration-${step}\\)`),
      );
    }
  });

  it('the shared --cd-* easings resolve from the cdl easings', () => {
    for (const curve of ['standard', 'decelerate', 'accelerate']) {
      expect(tokensCss, `--cd-ease-${curve}`).toMatch(
        new RegExp(`--cd-ease-${curve}:\\s*var\\(--cdl-ease-${curve}\\)`),
      );
    }
  });

  it('does not redeclare a cd duration literal that cdl already owns', () => {
    // A literal here is exactly how the two scales drifted apart the first time.
    expect(tokensCss).not.toMatch(/--cd-duration-(fast|normal|slow|slower):\s*\d/);
  });

  it('leaves the cdl scale as the single place those numbers are written', () => {
    expect(cdlTokensCss).toMatch(/--cdl-duration-fast:\s*80ms/);
    expect(cdlTokensCss).toMatch(/--cdl-duration-normal:\s*150ms/);
    expect(cdlTokensCss).toMatch(/--cdl-duration-slow:\s*250ms/);
    expect(cdlTokensCss).toMatch(/--cdl-duration-slower:\s*400ms/);
  });

  it('declares each --motion-transition-* composite in exactly one file', () => {
    for (const step of ['fast', 'normal', 'slow']) {
      const declaration = new RegExp(`^\\s*--motion-transition-${step}:`, 'm');
      const owners = [
        ['primitives.css', primitivesCss],
        ['design-tokens.css', designTokensCss],
      ].filter(([, css]) => declaration.test(css as string));

      expect(
        owners.map(([name]) => name),
        `--motion-transition-${step} should have exactly one owner`,
      ).toEqual(['design-tokens.css']);
    }
  });

  it('gives every looping status indicator a tier token instead of its own tempo', () => {
    const cssFiles = readdirSync(join(__dirname, '..'), { recursive: true, encoding: 'utf8' })
      .filter((name) => name.endsWith('.css'))
      .map((name) => join(__dirname, '..', name));

    // Spinners and skeletons are progress affordances, not urgency signals --
    // their tempo is a separate concern and deliberately out of scope here.
    const EXEMPT = /spin|shimmer|skeleton|dash/i;
    const offenders: string[] = [];

    for (const file of cssFiles) {
      // Comments describing the old values are not declarations. This codebase
      // has several checkers that scan comment prose and flag it, which is how
      // a note explaining a rule ends up failing that very rule.
      const withoutComments = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      // Walk DECLARATIONS, not lines: Prettier wraps a long `animation:` value
      // onto continuation lines, and a line-based scan then either misses the
      // duration (it sits on the next line) or reports the continuation line
      // as a declaration of its own -- both happened on 2026-09-03.
      for (const unit of withoutComments.split(/(?<=[;{}])/)) {
        const declaration = unit.replace(/\s+/g, ' ').trim();
        if (!declaration.includes('infinite') || EXEMPT.test(declaration)) continue;
        // A bare duration literal on a looping indicator is the thing this
        // guard exists to stop: it is how nine unsynchronised cadences appeared.
        if (/\b\d+(\.\d+)?m?s\b/.test(declaration) && !declaration.includes('var(--cdl-pulse-')) {
          offenders.push(`${file.replace(/.*[\\/]src[\\/]/, 'src/')}: ${declaration}`);
        }
      }
    }

    expect(
      offenders,
      `looping indicators with a hand-picked tempo:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('keeps the reduced-motion collapse with the scale that owns the values', () => {
    // tokens.css used to zero --cd-duration-* itself. With the aliases above that
    // block is redundant, and a stale copy of it would silently win over the cdl
    // collapse it was meant to mirror.
    expect(tokensCss).not.toMatch(/--cd-duration-fast:\s*0ms/);
    expect(cdlTokensCss).toMatch(/--cdl-duration-fast:\s*0ms/);
  });
});
