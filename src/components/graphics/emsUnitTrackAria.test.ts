import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'CdlGraphicKit.tsx'), 'utf8');

describe('EmsUnitTrackGraphic ARIA role (Cycle 214)', () => {
  // Regression guard for a real axe-core aria-prohibited-attr violation
  // (serious impact): the track's root <div> had aria-label with no
  // explicit role, so its implicit ARIA role is "generic" — which does not
  // support an accessible name, so aria-label was flagged as prohibited (and
  // silently ignored by assistive tech). Fixed with role="progressbar" (a
  // genuinely accurate semantic for a 0-100 percentage track) plus real
  // aria-valuenow/min/max, which also makes the percentage announce
  // correctly instead of just suppressing the axe finding.

  it('EmsUnitTrackGraphic declares role="progressbar" with aria-value* attributes', () => {
    const fn = source.match(/export function EmsUnitTrackGraphic[\s\S]*?\n\}/)?.[0];
    expect(fn).toBeDefined();
    expect(fn).toContain('role="progressbar"');
    expect(fn).toContain('aria-valuenow={progress}');
    expect(fn).toContain('aria-valuemin={0}');
    expect(fn).toContain('aria-valuemax={100}');
    expect(fn).toContain('aria-label={unitId');
  });
});
