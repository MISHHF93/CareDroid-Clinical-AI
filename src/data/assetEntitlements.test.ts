import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  filterToolsByEntitlements,
  isAssetEntitled,
  LEGACY_TOOL_ID_ALIASES,
  setPlatformEntitlementContext,
} from './assetEntitlements';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseAliasBlock(source: string): Record<string, string[]> {
  const nameIdx = source.indexOf('LEGACY_TOOL_ID_ALIASES');
  const braceStart = source.indexOf('{', nameIdx);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  const block = source.slice(braceStart, i);
  const obj: Record<string, string[]> = {};
  for (const m of block.matchAll(/'?([\w-]+)'?:\s*\[([^\]]*)\]/g)) {
    obj[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  }
  return obj;
}

describe('assetEntitlements', () => {
  it('filters tools by entitled asset ids when org context is set', () => {
    setPlatformEntitlementContext({
      organization: { id: 'org-1' },
      entitledAssetIds: ['qsofa', 'news2'],
    });
    const tools = [
      { id: 'qsofa', name: 'qSOFA' },
      { id: 'sofa-score', name: 'SOFA' },
      { id: 'news2', name: 'NEWS2' },
    ];
    const filtered = filterToolsByEntitlements(tools);
    expect(filtered.map((t) => t.id)).toEqual(['qsofa', 'news2']);
    setPlatformEntitlementContext(null);
  });

  it('isAssetEntitled returns true without org filter', () => {
    setPlatformEntitlementContext(null);
    expect(isAssetEntitled('any-tool')).toBe(true);
  });

  it('denies empty organization entitlements in strict SaaS mode', () => {
    setPlatformEntitlementContext({
      organization: { id: 'org-1' },
      entitledAssetIds: [],
      strictSaasEntitlements: true,
    });
    expect(isAssetEntitled('qsofa')).toBe(false);
    expect(filterToolsByEntitlements([{ id: 'qsofa' }])).toEqual([]);
    setPlatformEntitlementContext(null);
  });

  it('duplicate-system-audit: Legacy tool id aliases -- matches the backend seed map exactly', () => {
    // "Alias map drift breaks launch gating" -- docs/duplicate-system-audit.md's stated
    // risk for this finding. Two independently hand-maintained copies of the same map
    // exist (this file and backend/.../platform-asset-seed.data.ts) because the frontend
    // needs launch-gating decisions before any network round trip. Parses the real
    // backend source rather than trusting a second hand-typed copy, so a future edit to
    // one side without the other fails this test instead of silently drifting.
    const backendSource = readFileSync(
      join(
        __dirname,
        '../../backend/src/modules/platform-assets/data/platform-asset-seed.data.ts'
      ),
      'utf8'
    );
    const backendAliases = parseAliasBlock(backendSource);
    expect(Object.keys(backendAliases).length).toBeGreaterThan(0);
    expect(LEGACY_TOOL_ID_ALIASES).toEqual(backendAliases);
  });
});
