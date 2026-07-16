import { describe, expect, it } from 'vitest';
import { apiFailureToResultError, sanitizeApiError } from './apiErrorHandling';

describe('apiErrorHandling Stage C taxonomy', () => {
  it('sanitizeApiError extracts status and message', () => {
    const s = sanitizeApiError({ message: 'nope', status: 403 });
    expect(s.status).toBe(403);
    expect(s.message).toBe('nope');
  });

  it('maps HTTP 403 to FORBIDDEN ResultError', () => {
    const e = apiFailureToResultError({ message: 'denied', status: 403 });
    expect(e.code).toBe('FORBIDDEN');
    expect(e.detail).toBe('http_403');
    expect(e.retryable).toBe(false);
  });

  it('maps network/zero status to NETWORK retryable', () => {
    const e = apiFailureToResultError({ message: 'offline' });
    expect(e.code).toBe('NETWORK');
    expect(e.retryable).toBe(true);
  });

  it('maps 503 to DEPENDENCY_UNAVAILABLE', () => {
    const e = apiFailureToResultError({ status: 503, message: 'down' });
    expect(e.code).toBe('DEPENDENCY_UNAVAILABLE');
    expect(e.retryable).toBe(true);
  });
});
