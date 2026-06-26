/**
 * Sidebar tool grouping and list shaping (toolRegistry → visible nav).
 */

import { getUserFacingToolRegistryProjection } from './toolInventory';

/** Category section order in Clinical Tools sidebar. */
export const SIDEBAR_CATEGORY_ORDER = Object.freeze([
  'Diagnostic',
  'Calculator',
  'Reference',
  'Education & Simulation',
  'Laboratory',
  'Visualization',
  'AI System',
  'Fleet',
  'Hospital Operations',
  'IoT',
]);

/**
 * @param {Array<{ category?: string, name: string }>} tools
 * @returns {Array<{ category: string, tools: Array<{ category?: string, name: string }> }>}
 */
export function groupSidebarToolsByCategory(tools) {
  const byCategory = new Map();
  for (const tool of tools) {
    const category = tool.category || 'Other';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category).push(tool);
  }

  const ordered = SIDEBAR_CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => ({
    category,
    tools: byCategory.get(category).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const other = [...byCategory.keys()].filter((c) => !SIDEBAR_CATEGORY_ORDER.includes(c));
  for (const category of other.sort()) {
    ordered.push({
      category,
      tools: byCategory.get(category).sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return ordered;
}

/**
 * Split workspace tools into pinned, favorites, and main catalog without duplicate cards.
 * @param {Array<{ id: string }>} workspaceTools
 * @param {string[]} pinned
 * @param {string[]} favorites
 */
export function partitionSidebarTools(workspaceTools, pinned, favorites) {
  const pinnedSet = new Set(pinned);
  const favSet = new Set(favorites);

  const pinnedTools = workspaceTools.filter((t) => pinnedSet.has(t.id));
  const favoriteTools = workspaceTools.filter((t) => favSet.has(t.id) && !pinnedSet.has(t.id));
  const catalogTools = workspaceTools.filter((t) => !pinnedSet.has(t.id) && !favSet.has(t.id));

  return {
    pinnedTools,
    favoriteTools,
    catalogTools,
    categoryGroups: groupSidebarToolsByCategory(catalogTools),
  };
}

/**
 * Merge persisted workspaces with current registry (new tools appear in All Tools).
 * @param {Array<{ id: string, name: string, toolIds: string[] }>} stored
 * @param {Array<{ id: string, name: string, toolIds: string[] }>} defaults
 */
export function mergeWorkspacesWithRegistry(stored, defaults) {
  const registryIds = getUserFacingToolRegistryProjection().map((t) => t.id);
  const defaultById = Object.fromEntries(defaults.map((w) => [w.id, w]));

  return stored.map((workspace) => {
    const fallback = defaultById[workspace.id];
    if (workspace.id === 'all') {
      return {
        ...workspace,
        toolIds: [...new Set([...registryIds, ...(workspace.toolIds || [])])],
      };
    }
    if (fallback) {
      return {
        ...workspace,
        toolIds: [...new Set([...(fallback.toolIds || []), ...(workspace.toolIds || [])])],
      };
    }
    return workspace;
  });
}
