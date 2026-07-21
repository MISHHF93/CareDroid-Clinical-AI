/**
 * Frontend client for CareDroid Unified AI Node (local ML backbone).
 * Offline-safe: never throws; returns ok:false + local fallback on failure.
 */
import { apiFetchJson, getApiErrorMessage } from './apiClient';

export type UnifiedAiNodeHealthStatus = 'ready' | 'loading' | 'degraded' | 'unknown';

export type UnifiedAiNodeHealth = {
  status: UnifiedAiNodeHealthStatus;
  nodeId: string;
  singleNode: boolean;
  quarantine: 'none' | string;
  ready: boolean;
  scores: {
    nluAccuracy: number | null;
    artifactRouterAccuracy: number | null;
    composite: number | null;
  };
  source: 'live' | 'fallback';
  message?: string;
};

export type UnifiedAiNodeModelsHealth = UnifiedAiNodeHealth & {
  name?: string;
  registryModelId?: string;
  embeddingModel?: string;
  updatedAt?: string;
  heads?: {
    nlu?: {
      loaded?: boolean;
      accuracy?: number;
      testSetSize?: number;
      architecture?: string;
    };
    artifactRouter?: {
      loaded?: boolean;
      accuracy?: number;
      testSetSize?: number;
      architecture?: string;
    };
  };
};

/** Last known good offline snapshot for dashboards when backend is down. */
export const LOCAL_UNIFIED_AI_NODE_HEALTH: UnifiedAiNodeHealth = Object.freeze({
  status: 'unknown',
  nodeId: 'caredroid-unified-ai-node',
  singleNode: true,
  quarantine: 'none',
  ready: false,
  scores: {
    nluAccuracy: 1,
    artifactRouterAccuracy: 0.9645,
    composite: 0.9823,
  },
  source: 'fallback',
  message: 'Using last known node scores (backend health unavailable).',
});

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCompactHealth(payload: any, source: 'live' | 'fallback'): UnifiedAiNodeHealth {
  const scores = payload?.scores || {};
  return {
    status: (payload?.status as UnifiedAiNodeHealthStatus) || 'unknown',
    nodeId: String(payload?.nodeId || LOCAL_UNIFIED_AI_NODE_HEALTH.nodeId),
    singleNode: payload?.singleNode !== false,
    quarantine: String(payload?.quarantine || 'none'),
    ready: Boolean(payload?.ready),
    scores: {
      nluAccuracy: asNumber(scores.nluAccuracy),
      artifactRouterAccuracy: asNumber(scores.artifactRouterAccuracy),
      composite: asNumber(scores.composite),
    },
    source,
    message: payload?.message ? String(payload.message) : undefined,
  };
}

/**
 * Compact readiness probe: GET /api/ai/node/health
 */
export async function fetchUnifiedAiNodeHealth(): Promise<{
  ok: boolean;
  data: UnifiedAiNodeHealth;
  message: string;
}> {
  let response: Response | undefined;
  try {
    const result = await apiFetchJson('/ai/node/health');
    response = result.response;
    if (!response.ok) {
      return {
        ok: false,
        data: {
          ...LOCAL_UNIFIED_AI_NODE_HEALTH,
          message: getApiErrorMessage(null, response),
        },
        message: getApiErrorMessage(null, response),
      };
    }
    return {
      ok: true,
      data: normalizeCompactHealth(result.data, 'live'),
      message: '',
    };
  } catch (error: any) {
    return {
      ok: false,
      data: {
        ...LOCAL_UNIFIED_AI_NODE_HEALTH,
        message: getApiErrorMessage(error, response),
      },
      message: getApiErrorMessage(error, response),
    };
  }
}

/**
 * Full models health: GET /api/ai/node/models/health
 */
export async function fetchUnifiedAiNodeModelsHealth(): Promise<{
  ok: boolean;
  data: UnifiedAiNodeModelsHealth;
  message: string;
}> {
  let response: Response | undefined;
  try {
    const result = await apiFetchJson('/ai/node/models/health');
    response = result.response;
    if (!response.ok) {
      const compact = await fetchUnifiedAiNodeHealth();
      return {
        ok: false,
        data: compact.data,
        message: getApiErrorMessage(null, response),
      };
    }
    const data = result.data || {};
    const compact = normalizeCompactHealth(
      {
        status: data.status === 'ready' ? 'ready' : 'degraded',
        nodeId: data.nodeId,
        singleNode: data.singleNode,
        quarantine: data.quarantine,
        ready: data.status === 'ready',
        scores: data.scores,
      },
      'live',
    );
    return {
      ok: true,
      data: {
        ...compact,
        name: data.name,
        registryModelId: data.registryModelId,
        embeddingModel: data.embeddingModel,
        updatedAt: data.updatedAt,
        heads: data.heads,
      },
      message: '',
    };
  } catch (error: any) {
    return {
      ok: false,
      data: {
        ...LOCAL_UNIFIED_AI_NODE_HEALTH,
        message: getApiErrorMessage(error, response),
      },
      message: getApiErrorMessage(error, response),
    };
  }
}

export function formatNodeAccuracy(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value * 1000) / 10}%`;
}
