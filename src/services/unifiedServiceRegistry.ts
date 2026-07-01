/**
 * Unified service registry runtime — single snapshot for health, bottlenecks, and service map.
 * Consumers listed in unifiedServiceRegistry.config.ts should read from here.
 */
import {
  UNIFIED_SERVICE_HEALTH_ENDPOINTS,
  UNIFIED_SERVICE_REGISTRY_VERSION,
} from '../config/unifiedServiceRegistry.config';
import {
  buildBottleneckRegistrySnapshot,
  CURRENT_SERVICE_MAP,
  type BottleneckRegistrySnapshot,
} from './bottleneckRegistry';
import { fetchSaasHealthCenter, SAAS_HEALTH_FALLBACK } from './saasHealthApi';

export type UnifiedServiceHealthSnapshot = {
  version: string;
  generatedAt: string;
  endpoints: typeof UNIFIED_SERVICE_HEALTH_ENDPOINTS;
  services: typeof CURRENT_SERVICE_MAP;
  bottlenecks: BottleneckRegistrySnapshot;
};

export type PlatformHealthCheck = {
  id: string;
  label: string;
  status: 'healthy' | 'warning' | 'critical' | string;
  displayStatus?: string;
  summary?: string;
  evidence?: string[];
};

export type UnifiedPlatformHealthBundle = {
  generatedAt: string;
  registry: UnifiedServiceHealthSnapshot;
  saas: {
    ok: boolean;
    data: {
      status?: string;
      label?: string;
      generatedAt?: string | null;
      summary?: { healthy?: number; warning?: number; critical?: number; total?: number };
      checks?: PlatformHealthCheck[];
      source?: Record<string, unknown>;
    };
    message: string;
  };
};

export function getUnifiedServiceHealthSnapshot(
  input: Parameters<typeof buildBottleneckRegistrySnapshot>[0] = {},
): UnifiedServiceHealthSnapshot {
  const generatedAt = input.generatedAt || new Date().toISOString();
  return Object.freeze({
    version: UNIFIED_SERVICE_REGISTRY_VERSION,
    generatedAt,
    endpoints: UNIFIED_SERVICE_HEALTH_ENDPOINTS,
    services: CURRENT_SERVICE_MAP,
    bottlenecks: buildBottleneckRegistrySnapshot({ ...input, generatedAt }),
  });
}

/**
 * Fetches SaaS health from the backend and merges it with the local registry snapshot.
 * Canonical read path for SaasHealthCenter and ExecutiveCommandCenter platform panels.
 */
export async function fetchUnifiedPlatformHealth(
  registryInput: Parameters<typeof buildBottleneckRegistrySnapshot>[0] = {},
): Promise<UnifiedPlatformHealthBundle> {
  const generatedAt = new Date().toISOString();
  const [saasResult, registry] = await Promise.all([
    fetchSaasHealthCenter(),
    Promise.resolve(
      getUnifiedServiceHealthSnapshot({
        ...registryInput,
        generatedAt,
        sync: registryInput.sync || {
          status: 'registry-fetch',
          source: 'unifiedServiceRegistry',
          stale: false,
          message: 'Unified platform health bundle.',
        },
      }),
    ),
  ]);

  return {
    generatedAt,
    registry,
    saas: {
      ok: saasResult.ok,
      data: saasResult.data || SAAS_HEALTH_FALLBACK,
      message: saasResult.message,
    },
  };
}