/**
 * Sidebar tool registry invariants — every shipped tool has id, label, path, category.
 */

import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { ALL_REGISTRY_TOOL_IDS } from './clinicalToolIdContract';

describe('toolRegistry', () => {
  it('exports one row per canonical registry id', () => {
    const ids = toolRegistry.map((t) => t.id).sort();
    expect(ids).toEqual([...ALL_REGISTRY_TOOL_IDS].sort());
    expect(toolRegistry).toHaveLength(ALL_REGISTRY_TOOL_IDS.length);
  });

  it.each(ALL_REGISTRY_TOOL_IDS)('%s has required navigation fields', (id) => {
    const tool = toolRegistryById[id];
    expect(tool, `missing registry row ${id}`).toBeTruthy();
    expect(tool.id).toBe(id);
    expect(String(tool.name || '').trim().length).toBeGreaterThan(0);
    expect(String(tool.description || '').trim().length).toBeGreaterThan(0);
    expect(String(tool.category || '').trim().length).toBeGreaterThan(0);
    expect(
      tool.path || tool.panelTool,
      `${id} must define path or panelTool for launch`
    ).toBeTruthy();
  });

  it('uses unique registry ids', () => {
    const ids = toolRegistry.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
