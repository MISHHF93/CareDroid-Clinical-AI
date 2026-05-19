import { describe, it, expect } from 'vitest';
import toolRegistry from './toolRegistry';
import {
  groupSidebarToolsByCategory,
  mergeWorkspacesWithRegistry,
  partitionSidebarTools,
  SIDEBAR_CATEGORY_ORDER,
} from './sidebarToolPresentation';

describe('sidebarToolPresentation', () => {
  it('includes NLU hub-only calculators in registry for sidebar visibility', () => {
    const ids = toolRegistry.map((t) => t.id);
    expect(ids).toContain('apache2-calculator');
    expect(ids).toContain('curb65-calculator');
    expect(ids).toContain('gcs-calculator');
    expect(ids).toContain('wells-dvt-calculator');
  });

  it('partitionSidebarTools avoids duplicate cards across pinned, favorites, and catalog', () => {
    const tools = toolRegistry.slice(0, 6);
    const { pinnedTools, favoriteTools, catalogTools } = partitionSidebarTools(
      tools,
      [tools[0].id, tools[1].id],
      [tools[1].id, tools[2].id]
    );
    expect(pinnedTools.map((t) => t.id)).toEqual([tools[0].id, tools[1].id]);
    expect(favoriteTools.map((t) => t.id)).toEqual([tools[2].id]);
    const catalogIds = new Set(catalogTools.map((t) => t.id));
    expect(catalogIds.has(tools[0].id)).toBe(false);
    expect(catalogIds.has(tools[1].id)).toBe(false);
    expect(catalogIds.has(tools[2].id)).toBe(false);
  });

  it('groups catalog tools by category in stable order', () => {
    const groups = groupSidebarToolsByCategory(toolRegistry);
    expect(groups.map((g) => g.category)).toEqual(
      SIDEBAR_CATEGORY_ORDER.filter((c) =>
        toolRegistry.some((t) => t.category === c)
      )
    );
    const calculatorGroup = groups.find((g) => g.category === 'Calculator');
    expect(calculatorGroup?.tools.some((t) => t.id === 'qsofa')).toBe(true);
    expect(calculatorGroup?.tools.some((t) => t.id === 'apache2-calculator')).toBe(true);
  });

  it('mergeWorkspacesWithRegistry adds new registry ids to All Tools workspace', () => {
    const defaults = [
      { id: 'all', name: 'All Tools', toolIds: ['drug-check'] },
      { id: 'calculator', name: 'Calculator', toolIds: [] },
    ];
    const merged = mergeWorkspacesWithRegistry(
      [{ id: 'all', name: 'All Tools', toolIds: ['legacy-only'] }],
      defaults
    );
    expect(merged[0].toolIds).toContain('legacy-only');
    expect(merged[0].toolIds).toContain('drug-check');
    expect(merged[0].toolIds).toContain('apache2-calculator');
  });
});
