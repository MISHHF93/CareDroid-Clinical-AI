import { getCalculatorToolInventory, getUserFacingToolInventory } from './toolInventory';
import { SIMULATION_SCENARIOS } from './medicalSimulationCatalog';
import { PROTOCOL_PATHWAYS } from './protocolPathwayLibrary';

export const OFFLINE_CATALOG_KINDS = Object.freeze({
  TOOLS: 'tools',
  CALCULATORS: 'calculators',
  SIMULATIONS: 'simulations',
  PROTOCOLS: 'protocols',
});

export const OFFLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function normalizeTool(record) {
  return {
    id: record.id,
    label: record.label || record.name || record.title || record.id,
    path: record.path || record.launchPath || record.route || '/tools',
    category: record.category || record.surface || 'Tools',
    description: record.description || record.summary || '',
    offlineReady: true,
  };
}

function normalizeSimulation(record) {
  return {
    id: record.id,
    label: record.title,
    path: `/simulation/${record.id}`,
    category: record.category,
    difficulty: record.difficulty,
    duration: record.duration,
    objectives: record.objectives || [],
    offlineReady: true,
  };
}

function normalizeProtocol(record) {
  return {
    id: record.id,
    label: record.title,
    path: `/protocols#${record.id}`,
    category: record.category,
    version: record.currentVersion,
    updatedAt: record.updatedAt,
    summary: record.summary,
    linkedCalculators: record.linkedCalculators || [],
    linkedSimulations: record.linkedSimulations || [],
    offlineReady: true,
  };
}

export function isOfflineCatalogStale(cachedAt, now = Date.now(), ttlMs = OFFLINE_CACHE_TTL_MS) {
  if (!cachedAt) return true;
  const cachedTime = new Date(cachedAt).getTime();
  if (!Number.isFinite(cachedTime)) return true;
  return now - cachedTime > ttlMs;
}

export function buildOfflineCatalogSnapshots(now = Date.now()) {
  const cachedAt = nowIso(now);
  const toolRecords = getUserFacingToolInventory().map(normalizeTool);
  const calculatorRecords = getCalculatorToolInventory().map(normalizeTool);
  const simulationRecords = SIMULATION_SCENARIOS.map(normalizeSimulation);
  const protocolRecords = PROTOCOL_PATHWAYS.map(normalizeProtocol);

  return [
    {
      kind: OFFLINE_CATALOG_KINDS.TOOLS,
      label: 'Cached tools',
      cachedAt,
      count: toolRecords.length,
      items: toolRecords,
    },
    {
      kind: OFFLINE_CATALOG_KINDS.CALCULATORS,
      label: 'Cached calculators',
      cachedAt,
      count: calculatorRecords.length,
      items: calculatorRecords,
    },
    {
      kind: OFFLINE_CATALOG_KINDS.SIMULATIONS,
      label: 'Cached simulations',
      cachedAt,
      count: simulationRecords.length,
      items: simulationRecords,
    },
    {
      kind: OFFLINE_CATALOG_KINDS.PROTOCOLS,
      label: 'Cached protocols',
      cachedAt,
      count: protocolRecords.length,
      items: protocolRecords,
    },
  ];
}

export function summarizeOfflineCatalogs(catalogs = [] as any[], now = Date.now()) {
  const byKind = Object.fromEntries(catalogs.map((catalog) => [catalog.kind, catalog]));
  const entries = Object.values(OFFLINE_CATALOG_KINDS).map((kind) => {
    const catalog = byKind[kind];
    return {
      kind,
      label: catalog?.label || kind,
      count: catalog?.count ?? catalog?.items?.length ?? 0,
      cachedAt: catalog?.cachedAt || null,
      stale: isOfflineCatalogStale(catalog?.cachedAt, now),
    };
  });

  return {
    entries,
    totalItems: entries.reduce((sum, entry) => sum + entry.count, 0),
    staleCount: entries.filter((entry) => entry.stale).length,
    readyCount: entries.filter((entry) => entry.count > 0).length,
    lastCachedAt: entries
      .map((entry) => entry.cachedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || null,
  };
}
