/**
 * Shared LLM transport safety: request timeout/abort + per-provider circuit breaker.
 *
 * Addresses Monday readiness defect D1 — without these, a hung provider call
 * never surfaces a typed failure and can make the API appear "not responding".
 */

import { AIError, type AIRequest } from '../llmTransport';
import type { LlmProviderId } from './types';

export const DEFAULT_AI_REQUEST_TIMEOUT_MS = 30_000;
export const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 5;
export const DEFAULT_CIRCUIT_COOLDOWN_MS = 30_000;

export function readAiRequestTimeoutMs(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  if (typeof process === 'undefined') return DEFAULT_AI_REQUEST_TIMEOUT_MS;
  const raw = process.env.AI_REQUEST_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return DEFAULT_AI_REQUEST_TIMEOUT_MS;
}

export function readCircuitFailureThreshold(): number {
  if (typeof process === 'undefined') return DEFAULT_CIRCUIT_FAILURE_THRESHOLD;
  const raw = process.env.AI_CIRCUIT_FAILURE_THRESHOLD;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return DEFAULT_CIRCUIT_FAILURE_THRESHOLD;
}

export function readCircuitCooldownMs(): number {
  if (typeof process === 'undefined') return DEFAULT_CIRCUIT_COOLDOWN_MS;
  const raw = process.env.AI_CIRCUIT_COOLDOWN_MS;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return DEFAULT_CIRCUIT_COOLDOWN_MS;
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: string }).name;
  if (name === 'AbortError' || name === 'TimeoutError') return true;
  const message = String((error as { message?: string }).message || '');
  return /aborted|abort(ed)?|timed?\s*out|timeout/i.test(message);
}

export function toTimeoutAIError(
  error: unknown,
  requestType: AIRequest['requestType'],
  timeoutMs: number,
): AIError {
  return new AIError({
    message: `LLM provider request timed out after ${timeoutMs}ms`,
    code: 'AI_TIMEOUT',
    requestType,
    retryable: true,
    cause: error,
  });
}

/**
 * fetch() wrapper that always attaches an AbortController deadline.
 * Pass an existing signal to compose with caller cancellation.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<Response> {
  const timeoutMs = readAiRequestTimeoutMs(options?.timeoutMs);
  const controller = new AbortController();
  const external = options?.signal || init.signal || undefined;

  let externalListener: (() => void) | undefined;
  if (external) {
    if (external.aborted) {
      controller.abort((external as any).reason);
    } else {
      externalListener = () => controller.abort((external as any).reason);
      external.addEventListener('abort', externalListener, { once: true });
    }
  }

  const timer = setTimeout(() => {
    controller.abort(
      typeof DOMException !== 'undefined'
        ? new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError')
        : new Error(`Request timed out after ${timeoutMs}ms`),
    );
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    if (external && externalListener) {
      external.removeEventListener('abort', externalListener);
    }
  }
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitSnapshot {
  provider: LlmProviderId | string;
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
  cooldownMs: number;
  failureThreshold: number;
}

export class ProviderCircuitBreaker {
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private halfOpenProbeInFlight = false;

  constructor(
    readonly provider: LlmProviderId | string,
    private readonly now: () => number = () => Date.now(),
  ) {}

  snapshot(): CircuitSnapshot {
    return {
      provider: this.provider,
      state: this.state(),
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt,
      cooldownMs: readCircuitCooldownMs(),
      failureThreshold: readCircuitFailureThreshold(),
    };
  }

  state(): CircuitState {
    if (this.openedAt == null) return 'closed';
    const elapsed = this.now() - this.openedAt;
    if (elapsed >= readCircuitCooldownMs()) return 'half-open';
    return 'open';
  }

  /** Returns true if a call may proceed. */
  allow(): boolean {
    const state = this.state();
    if (state === 'closed') return true;
    if (state === 'open') return false;
    // half-open: allow a single probe
    if (this.halfOpenProbeInFlight) return false;
    this.halfOpenProbeInFlight = true;
    return true;
  }

  assertAllowed(requestType: AIRequest['requestType']): void {
    if (this.allow()) return;
    const snap = this.snapshot();
    throw new AIError({
      message: `LLM circuit open for provider "${this.provider}" after ${snap.consecutiveFailures} failures; cooling down ${snap.cooldownMs}ms`,
      code: 'AI_CIRCUIT_OPEN',
      requestType,
      retryable: true,
    });
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.halfOpenProbeInFlight = false;
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    this.halfOpenProbeInFlight = false;
    if (this.consecutiveFailures >= readCircuitFailureThreshold()) {
      this.openedAt = this.now();
    }
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.halfOpenProbeInFlight = false;
  }
}

const breakers = new Map<string, ProviderCircuitBreaker>();

export function getProviderCircuit(
  provider: LlmProviderId | string,
  now?: () => number,
): ProviderCircuitBreaker {
  const key = String(provider || 'unknown');
  let breaker = breakers.get(key);
  if (!breaker) {
    breaker = new ProviderCircuitBreaker(key, now);
    breakers.set(key, breaker);
  }
  return breaker;
}

export function resetAllProviderCircuits(): void {
  for (const breaker of breakers.values()) breaker.reset();
  breakers.clear();
}

export function listProviderCircuitSnapshots(): CircuitSnapshot[] {
  return Array.from(breakers.values()).map((b) => b.snapshot());
}
