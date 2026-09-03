import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { describe, expect, it } from 'vitest';
import { normalizedCodeIsCoherent, type NormalizedCode } from './patientDocumentArtifact';

describe('NormalizedCode coherence', () => {
  it('treats a coded entry without a code as incoherent', () => {
    expect(normalizedCodeIsCoherent({ system: 'RXNORM', status: 'coded' })).toBe(false);
    expect(normalizedCodeIsCoherent({ system: 'RXNORM', status: 'coded', code: '   ' })).toBe(
      false,
    );
    expect(normalizedCodeIsCoherent({ system: 'RXNORM', status: 'coded', code: '2047766' })).toBe(
      true,
    );
  });

  it('allows an unbound entry to carry a display with no code', () => {
    const unbound: NormalizedCode = {
      system: 'SNOMED_CT',
      display: 'penicillin',
      status: 'unbound',
      unboundReason: 'SNOMED CT requires an affiliate licence; no lookup performed.',
    };
    expect(normalizedCodeIsCoherent(unbound)).toBe(true);
  });

  it('never lets a producer name a code system without declaring whether it is actually coded', () => {
    // The original bug: seven call sites across four code systems wrote
    // `{ system: 'SNOMED_CT', display: <free text> }` -- naming a terminology
    // and carrying none of it. Nothing rendered it, so the false claim was
    // invisible, but an export or a downstream consumer would have believed
    // it. Every literal that names a `system` must now also say `status`.
    // Both sides: the same shape was duplicated in the backend extractor.
    const files = globSync(['src/**/*.{ts,tsx}', 'backend/src/**/*.ts'], {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/types/patientDocumentArtifact.ts'],
    });

    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('normalizedCode')) continue;
      // Each `normalizedCode: { ... }` literal, non-greedy to the closing brace.
      const literals = source.match(/normalizedCode:\s*\{[^}]*\}/g) || [];
      for (const literal of literals) {
        if (literal.includes('system:') && !literal.includes('status:')) {
          offenders.push(`${file}: ${literal.replace(/\s+/g, ' ').slice(0, 90)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
