/**
 * Standardized emergency API helpers — envelope parsing, guarded requests, structured logging.
 */

export type EmergencyApiResult<T> = Readonly<{
  ok: boolean;
  data: T | null;
  error: string | null;
  source: 'network' | 'parse' | 'envelope';
  endpoint?: string;
}>;

type EmergencyEnvelopeShape = Readonly<{
  module?: string;
  success?: boolean;
  title?: string;
  generatedAt?: string;
  data?: unknown;
  status?: string;
}>;

export function logEmergencyApiWarning(
  context: string,
  error: unknown,
  extra: Record<string, unknown> = {},
): void {
  const message = error instanceof Error ? error.message : String(error);
  if (import.meta.env?.DEV) {
    console.warn(`[CareDroid Emergency API] ${context}: ${message}`, extra);
  }
}

/** Unwrap module or success envelope shapes from emergency-os endpoints. */
export function unwrapEmergencyEnvelope<T>(response: unknown): T | null {
  if (!response || typeof response !== 'object') return null;
  const record = response as EmergencyEnvelopeShape;
  if (record.data !== undefined && record.data !== null) {
    return record.data as T;
  }
  return response as T;
}

/** Extract workflow orchestration tasks from heterogeneous backend envelopes. */
export function extractWorkflowOrchestrationTasks(response: unknown): unknown[] | null {
  const data = unwrapEmergencyEnvelope<Record<string, unknown>>(response);
  if (!data || typeof data !== 'object') return null;
  const tasks = data.tasks ?? (data.snapshot as { tasks?: unknown[] } | undefined)?.tasks;
  return Array.isArray(tasks) ? tasks : null;
}

export function createEmergencyApiSuccess<T>(data: T, endpoint?: string): EmergencyApiResult<T> {
  return Object.freeze({
    ok: true,
    data,
    error: null,
    source: 'network',
    endpoint,
  });
}

export function createEmergencyApiFailure(
  error: unknown,
  source: EmergencyApiResult<unknown>['source'] = 'network',
  endpoint?: string,
): EmergencyApiResult<never> {
  const message = error instanceof Error ? error.message : String(error);
  return Object.freeze({
    ok: false,
    data: null,
    error: message,
    source,
    endpoint,
  });
}

export async function guardedEmergencyRequest<T>(
  context: string,
  endpoint: string,
  request: () => Promise<T>,
): Promise<EmergencyApiResult<T>> {
  try {
    const data = await request();
    return createEmergencyApiSuccess(data, endpoint);
  } catch (error) {
    logEmergencyApiWarning(context, error, { endpoint });
    return createEmergencyApiFailure(error, 'network', endpoint);
  }
}
