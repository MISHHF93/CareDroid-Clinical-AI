/**
 * Cycle 271: breaks the apiClient.ts <-> observabilityService.ts circular
 * dependency (madge #16 in the "64 circular dependencies" audit -- one of
 * the 2 genuine candidates identified but deferred since the campaign's
 * first pass, roadmap item #1). apiClient.ts needs observabilityService's
 * trace-header/timing hooks on every request; observabilityService.ts needs
 * apiClient's apiFetch to flush its own telemetry batch to the backend --
 * a real mutual need, not a false-positive type-only cycle. Rather than
 * merge the two files or lose either direction of functionality, apiClient
 * now depends only on this small neutral module (no dependency on
 * observabilityService or anything else), and observabilityService
 * registers its real implementation here once at module load -- the same
 * "register a callback into a neutral module" pattern observabilityService
 * itself already uses for lib/ai/auditLogger via registerAIAuditSink.
 * Until registration happens, the hooks are harmless no-ops (empty headers,
 * dropped timing samples) -- never a crash -- but in practice
 * observabilityService.ts is imported and its module body runs during
 * src/main.tsx's startup sequence, well before any real fetch call, so
 * live traffic always gets the real implementation.
 */

export interface ApiTelemetryHooks {
  buildTraceHeaders(workflowTraceId?: string): Record<string, string>;
  recordApiTiming(input: { path: string; method: string; durationMs: number; status: number }): void;
}

const noopHooks: ApiTelemetryHooks = {
  buildTraceHeaders: () => ({}),
  recordApiTiming: () => {},
};

let activeHooks: ApiTelemetryHooks = noopHooks;

export function registerApiTelemetryHooks(hooks: ApiTelemetryHooks): void {
  activeHooks = hooks;
}

export function buildTraceHeaders(workflowTraceId?: string): Record<string, string> {
  return activeHooks.buildTraceHeaders(workflowTraceId);
}

export function recordApiTiming(input: {
  path: string;
  method: string;
  durationMs: number;
  status: number;
}): void {
  activeHooks.recordApiTiming(input);
}
