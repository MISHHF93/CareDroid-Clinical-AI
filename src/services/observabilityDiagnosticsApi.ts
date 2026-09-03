import { OBSERVABILITY_CONTRACT } from '../config/observabilityModel';
import { apiFetch, parseApiResponse } from './apiClient';
import observabilityService from './observabilityService';

export type ServerObservabilityDiagnostics = Readonly<{
  engineId: string;
  generatedAt: string;
  totals: Readonly<{
    bufferedEvents: number;
    crashReports: number;
    slowApiCount: number;
    errorCount: number;
  }>;
  categoryCounts: Readonly<Record<string, number>>;
  recentWorkflow: readonly Record<string, unknown>[];
  recentErrors: readonly Record<string, unknown>[];
  slowApiCalls: readonly Record<string, unknown>[];
  recentCrashes: readonly Record<string, unknown>[];
}>;

export type ObservabilityHealthProbe = Readonly<{
  status: 'ok' | 'degraded' | 'unavailable';
  bufferedEvents?: number;
  errorCount?: number;
  slowApiCount?: number;
  generatedAt?: string;
}>;

export function getClientObservabilityDiagnostics() {
  return observabilityService.buildDiagnosticsSnapshot();
}

export async function fetchServerObservabilityDiagnostics(): Promise<{
  ok: boolean;
  data: ServerObservabilityDiagnostics | null;
  message: string;
}> {
  try {
    const response = await apiFetch(OBSERVABILITY_CONTRACT.diagnosticsEndpoint);
    const data = await parseApiResponse<ServerObservabilityDiagnostics | null>(response, {
      fallback: null,
    });
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message:
          (data as { message?: string } | null)?.message || 'Server diagnostics unavailable.',
      };
    }
    return { ok: true, data, message: '' };
  } catch (error: unknown) {
    return {
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : 'Server diagnostics request failed.',
    };
  }
}

export async function fetchObservabilityPerformance(): Promise<{
  ok: boolean;
  data: Record<string, unknown> | null;
  message: string;
}> {
  try {
    const response = await apiFetch(OBSERVABILITY_CONTRACT.performanceEndpoint);
    const data = await parseApiResponse<Record<string, unknown> | null>(response, {
      fallback: null,
    });
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message:
          (data as { message?: string } | null)?.message || 'Performance summary unavailable.',
      };
    }
    return { ok: true, data, message: '' };
  } catch (error: unknown) {
    return {
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : 'Performance summary request failed.',
    };
  }
}

export async function fetchObservabilityTrace(correlationId: string): Promise<{
  ok: boolean;
  data: Record<string, unknown> | null;
  message: string;
}> {
  const normalized = String(correlationId || '').trim();
  if (!normalized) {
    return { ok: false, data: null, message: 'Correlation id is required.' };
  }
  try {
    const response = await apiFetch(
      `${OBSERVABILITY_CONTRACT.traceEndpoint}/${encodeURIComponent(normalized)}`,
    );
    const data = await parseApiResponse<Record<string, unknown> | null>(response, {
      fallback: null,
    });
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message: (data as { message?: string } | null)?.message || 'Trace timeline unavailable.',
      };
    }
    return { ok: true, data, message: '' };
  } catch (error: unknown) {
    return {
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : 'Trace timeline request failed.',
    };
  }
}

export async function probeObservabilityHealth(): Promise<ObservabilityHealthProbe> {
  try {
    const response = await apiFetch(OBSERVABILITY_CONTRACT.healthEndpoint);
    const data = await parseApiResponse<ObservabilityHealthProbe>(response, {
      fallback: { status: 'unavailable' },
    });
    if (!response.ok) {
      return Object.freeze({ status: 'unavailable' });
    }
    return Object.freeze(data || { status: 'unavailable' });
  } catch {
    return Object.freeze({ status: 'unavailable' });
  }
}
