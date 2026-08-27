/**
 * Shared, real HTTP reachability probe: HEAD request, falling back to GET
 * when the endpoint returns 405/501 (method not allowed/not implemented).
 *
 * This used to be implemented only inside `health.routes.ts`'s
 * `checkExternalApi()` (used for the generic `/health` route's "MoH FHIR"
 * and "Wearable API" components). `MohFhirService.checkHealth()` had a
 * second, fake "is MoH FHIR healthy" implementation that never made a
 * network call at all -- it just echoed `config.enabled` back as
 * `connected`. Extracting the real probe here lets both call sites share
 * one real implementation instead of silently disagreeing about what
 * "reachable" means.
 */
export interface HttpEndpointProbeResult {
  method: 'HEAD' | 'GET';
  statusCode: number;
  statusText: string;
  /** True when the endpoint responded with a non-5xx status (a live server answered, even if 4xx). */
  reachable: boolean;
}

/** Same env var health.routes.ts already used for its own probe timeout. */
export const DEFAULT_HTTP_PROBE_TIMEOUT_MS = Number(process.env.HEALTH_CHECK_TIMEOUT_MS || 2000);

export async function probeHttpEndpoint(
  endpoint: string,
  timeoutMs: number = DEFAULT_HTTP_PROBE_TIMEOUT_MS,
): Promise<HttpEndpointProbeResult> {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable in this Node runtime.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        accept: 'application/fhir+json, application/json;q=0.9, */*;q=0.1',
      },
    });
    let method: 'HEAD' | 'GET' = 'HEAD';

    if (response.status === 405 || response.status === 501) {
      response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          accept: 'application/fhir+json, application/json;q=0.9, */*;q=0.1',
        },
      });
      method = 'GET';
    }

    return {
      method,
      statusCode: response.status,
      statusText: response.statusText,
      reachable: response.status < 500,
    };
  } finally {
    clearTimeout(timeout);
  }
}
