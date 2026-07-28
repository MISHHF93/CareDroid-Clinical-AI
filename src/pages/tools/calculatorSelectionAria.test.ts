import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'Calculators.tsx'), 'utf8');

describe('calculator-selection ARIA role (Cycle 214)', () => {
  // Regression guard for a real axe-core aria-required-children violation
  // (critical impact), found by the first successful live run of the a11y
  // suite in a long time: .calculator-selection had role="list" but its
  // children (CalculatorSelectCard) are role="button" toggle controls, not
  // role="listitem" — a role="list" container's required owned elements per
  // the ARIA spec. Fixed by switching the container to role="group" (the
  // correct semantic for a set of interactive controls), rather than adding
  // role="listitem" to elements that are genuinely buttons, not list items.

  it('calculator-selection uses role="group", not role="list"', () => {
    expect(source).toContain('className="calculator-selection" role="group"');
    expect(source).not.toContain('className="calculator-selection" role="list"');
  });

  it('CalculatorSelectCard children remain role="button" (unchanged)', () => {
    expect(source).toContain('role="button"');
  });
});
