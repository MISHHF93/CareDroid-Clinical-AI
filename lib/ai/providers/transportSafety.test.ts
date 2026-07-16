import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIError } from '../llmTransport';
import {
  DEFAULT_AI_REQUEST_TIMEOUT_MS,
  fetchWithTimeout,
  getProviderCircuit,
  isAbortError,
  ProviderCircuitBreaker,
  readAiRequestTimeoutMs,
  resetAllProviderCircuits,
  toTimeoutAIError,
} from './transportSafety';

describe('transportSafety', () => {
  const prevTimeout = process.env.AI_REQUEST_TIMEOUT_MS;
  const prevThreshold = process.env.AI_CIRCUIT_FAILURE_THRESHOLD;
  const prevCooldown = process.env.AI_CIRCUIT_COOLDOWN_MS;

  beforeEach(() => {
    resetAllProviderCircuits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetAllProviderCircuits();
    if (prevTimeout === undefined) delete process.env.AI_REQUEST_TIMEOUT_MS;
    else process.env.AI_REQUEST_TIMEOUT_MS = prevTimeout;
    if (prevThreshold === undefined) delete process.env.AI_CIRCUIT_FAILURE_THRESHOLD;
    else process.env.AI_CIRCUIT_FAILURE_THRESHOLD = prevThreshold;
    if (prevCooldown === undefined) delete process.env.AI_CIRCUIT_COOLDOWN_MS;
    else process.env.AI_CIRCUIT_COOLDOWN_MS = prevCooldown;
  });

  it('reads timeout from env with a safe default', () => {
    delete process.env.AI_REQUEST_TIMEOUT_MS;
    expect(readAiRequestTimeoutMs()).toBe(DEFAULT_AI_REQUEST_TIMEOUT_MS);
    process.env.AI_REQUEST_TIMEOUT_MS = '15000';
    expect(readAiRequestTimeoutMs()).toBe(15_000);
    expect(readAiRequestTimeoutMs(5_000)).toBe(5_000);
  });

  it('fetchWithTimeout aborts hung fetches and surfaces AbortError', async () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '50';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal;
            if (!signal) return;
            signal.addEventListener(
              'abort',
              () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              },
              { once: true },
            );
          }),
      ),
    );

    const pending = fetchWithTimeout('https://example.test/llm', { method: 'POST' }, { timeoutMs: 50 });
    const expectation = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(60);
    await expectation;
  });

  it('maps abort errors to AI_TIMEOUT', () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    expect(isAbortError(abort)).toBe(true);
    const aiError = toTimeoutAIError(abort, 'COPILOT_CHAT' as any, 50);
    expect(aiError).toBeInstanceOf(AIError);
    expect(aiError.code).toBe('AI_TIMEOUT');
    expect(aiError.retryable).toBe(true);
    expect(aiError.message).toContain('50ms');
  });

  it('opens the circuit after the failure threshold and cools down', () => {
    process.env.AI_CIRCUIT_FAILURE_THRESHOLD = '3';
    process.env.AI_CIRCUIT_COOLDOWN_MS = '1000';
    let now = 1_000;
    const breaker = new ProviderCircuitBreaker('anthropic', () => now);

    expect(breaker.allow()).toBe(true);
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state()).toBe('closed');
    breaker.recordFailure();
    expect(breaker.state()).toBe('open');
    expect(breaker.allow()).toBe(false);

    now += 1_001;
    expect(breaker.state()).toBe('half-open');
    expect(breaker.allow()).toBe(true);
    // only one half-open probe at a time
    expect(breaker.allow()).toBe(false);

    breaker.recordSuccess();
    expect(breaker.state()).toBe('closed');
    expect(breaker.allow()).toBe(true);
  });

  it('assertAllowed throws AI_CIRCUIT_OPEN when the breaker is open', () => {
    process.env.AI_CIRCUIT_FAILURE_THRESHOLD = '1';
    process.env.AI_CIRCUIT_COOLDOWN_MS = '60_000';
    const breaker = getProviderCircuit('anthropic');
    breaker.recordFailure();
    expect(() => breaker.assertAllowed('COPILOT_CHAT' as any)).toThrowError(
      expect.objectContaining({ code: 'AI_CIRCUIT_OPEN' }),
    );
  });
});
