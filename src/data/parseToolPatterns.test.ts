/**
 * Deterministic parser tests for backend tool.patterns.ts (NLU keyword extraction).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  parseClinicalToolPatterns,
  extractToolPatternKeywords,
  normalizeAliasKey,
  aliasToSlug,
} from './parseToolPatterns';
const AUDITED_CLINICAL_TOOL_IDS = Object.freeze(['phq9', 'gad7', 'copd-gold', 'rome-iv-ibs']);

const __dirname = dirname(fileURLToPath(import.meta.url));
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('parseClinicalToolPatterns', () => {
  it('extracts audited clinical tool ids with non-empty keyword lists', () => {
    const parsed = parseClinicalToolPatterns(patternsSource);
    const byId = Object.fromEntries(parsed.map((p) => [p.toolId, p.keywords]));
    for (const id of AUDITED_CLINICAL_TOOL_IDS) {
      expect(byId[id], `missing toolId ${id}`).toBeDefined();
      expect(byId[id].length).toBeGreaterThan(3);
    }
  });

  it('extractToolPatternKeywords matches parseClinicalToolPatterns for phq9', () => {
    const fromHelper = extractToolPatternKeywords(patternsSource, 'phq9');
    const fromParse = parseClinicalToolPatterns(patternsSource).find((p) => p.toolId === 'phq9')
      ?.keywords;
    expect(fromHelper).toEqual(fromParse);
    expect(fromHelper).toContain('phq-9');
    expect(fromHelper).toContain('depression screen');
  });

  it('throws when tool id is absent from patterns source', () => {
    expect(() => extractToolPatternKeywords(patternsSource, 'not-registered-tool-xyz')).toThrow(
      /not found in tool\.patterns\.ts/
    );
  });
});

describe('alias normalization helpers', () => {
  it('normalizeAliasKey collapses whitespace and lowercases', () => {
    expect(normalizeAliasKey('  Depression   Screen  ')).toBe('depression screen');
  });

  it('aliasToSlug hyphenates normalized phrases', () => {
    expect(aliasToSlug('depression screen')).toBe('depression-screen');
    expect(aliasToSlug('Rome IV IBS')).toBe('rome-iv-ibs');
  });
});
