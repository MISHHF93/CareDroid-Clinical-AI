import { describe, it, expect } from 'vitest';
import {
  ok, err, isOk, isErr, assertNever,
  ErrorCode, resultError, errorToHttpStatus, httpStatusToErrorCode,
  type Result, type ResultError, type ProblemDetails,
} from './results';

describe('Result contracts', () => {
  describe('ok()', () => {
    it('creates a success result with data and timestamp', () => {
      const result = ok({ id: 1, name: 'test' });
      expect(result.ok).toBe(true);
      if (isOk(result)) {
        expect(result.data).toEqual({ id: 1, name: 'test' });
        expect(result.timestamp).toBeTruthy();
      }
    });

    it('creates success with null data', () => {
      const result = ok(null);
      expect(result.ok).toBe(true);
    });

    it('creates success with empty string data', () => {
      const result = ok('');
      expect(result.ok).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe('');
      }
    });

    it('creates success with numeric data', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(42);
      }
    });

    it('creates success with boolean data', () => {
      const result = ok(true);
      expect(result.ok).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(true);
      }
    });

    it('creates success with array data', () => {
      const result = ok([1, 2, 3]);
      expect(result.ok).toBe(true);
      if (isOk(result)) {
        expect(result.data).toEqual([1, 2, 3]);
      }
    });

    it('creates success with nested object data', () => {
      const data = { patient: { id: 'p1', vitals: { hr: 72 } } };
      const result = ok(data);
      expect(result.ok).toBe(true);
      if (isOk(result)) {
        expect(result.data).toEqual(data);
      }
    });

    it('timestamp is a valid ISO string', () => {
      const result = ok('hello');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('timestamp is mutable only on the value (readonly at type level)', () => {
      const result = ok(99);
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('err()', () => {
    it('creates a failure result with error and timestamp', () => {
      const error = resultError(ErrorCode.VALIDATION, 'Invalid input');
      const result = err(error);
      expect(result.ok).toBe(false);
      if (isErr(result)) {
        expect(result.error.code).toBe('VALIDATION');
        expect(result.error.message).toBe('Invalid input');
        expect(result.timestamp).toBeTruthy();
      }
    });

    it('timestamp is a valid ISO string', () => {
      const result = err(resultError(ErrorCode.UNKNOWN, 'fail'));
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('preserves all error fields', () => {
      const error = resultError(ErrorCode.NETWORK, 'Connection refused', {
        detail: 'Port 8080 unreachable',
        correlationId: 'req-xyz',
        retryable: true,
        cause: new Error('ECONNREFUSED'),
      });
      const result = err(error);
      if (isErr(result)) {
        expect(result.error.code).toBe('NETWORK');
        expect(result.error.message).toBe('Connection refused');
        expect(result.error.detail).toBe('Port 8080 unreachable');
        expect(result.error.correlationId).toBe('req-xyz');
        expect(result.error.retryable).toBe(true);
        expect(result.error.cause).toBeInstanceOf(Error);
      }
    });
  });

  describe('type guards', () => {
    it('isOk returns true for success', () => {
      expect(isOk(ok(42))).toBe(true);
    });

    it('isOk returns false for failure', () => {
      expect(isOk(err(resultError(ErrorCode.INTERNAL, 'fail')))).toBe(false);
    });

    it('isErr returns true for failure', () => {
      expect(isErr(err(resultError(ErrorCode.INTERNAL, 'fail')))).toBe(true);
    });

    it('isErr returns false for success', () => {
      expect(isErr(ok(42))).toBe(false);
    });

    it('isOk narrows type for success data access', () => {
      const result = ok({ value: 99 });
      if (isOk(result)) {
        expect(result.data.value).toBe(99);
      }
    });

    it('isErr narrows type for error access', () => {
      const error = resultError(ErrorCode.NOT_FOUND, 'gone');
      const result = err(error);
      if (isErr(result)) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('assertNever', () => {
    it('throws for any input', () => {
      expect(() => assertNever('anything' as never)).toThrow('Unexpected value');
    });

    it('throws for numeric input', () => {
      expect(() => assertNever(42 as never)).toThrow('Unexpected value: 42');
    });
  });

  describe('ErrorCode', () => {
    it('has all expected codes', () => {
      expect(ErrorCode.VALIDATION).toBe('VALIDATION');
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCode.NETWORK).toBe('NETWORK');
      expect(ErrorCode.AI_UNAVAILABLE).toBe('AI_UNAVAILABLE');
      expect(ErrorCode.UNKNOWN).toBe('UNKNOWN');
    });

    it('has CONFLICT', () => {
      expect(ErrorCode.CONFLICT).toBe('CONFLICT');
    });

    it('has UNAUTHORIZED', () => {
      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    });

    it('has FORBIDDEN', () => {
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    });

    it('has TIMEOUT', () => {
      expect(ErrorCode.TIMEOUT).toBe('TIMEOUT');
    });

    it('has RATE_LIMIT', () => {
      expect(ErrorCode.RATE_LIMIT).toBe('RATE_LIMIT');
    });

    it('has DEPENDENCY_UNAVAILABLE', () => {
      expect(ErrorCode.DEPENDENCY_UNAVAILABLE).toBe('DEPENDENCY_UNAVAILABLE');
    });

    it('has DATABASE', () => {
      expect(ErrorCode.DATABASE).toBe('DATABASE');
    });

    it('has INTERNAL', () => {
      expect(ErrorCode.INTERNAL).toBe('INTERNAL');
    });

    it('has AI_SAFETY_REJECTION', () => {
      expect(ErrorCode.AI_SAFETY_REJECTION).toBe('AI_SAFETY_REJECTION');
    });

    it('has CANCELLED', () => {
      expect(ErrorCode.CANCELLED).toBe('CANCELLED');
    });

    it('has STALE_VERSION', () => {
      expect(ErrorCode.STALE_VERSION).toBe('STALE_VERSION');
    });

    it('every code is a non-empty string', () => {
      for (const code of Object.values(ErrorCode)) {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      }
    });
  });

  describe('resultError', () => {
    it('creates error with required fields', () => {
      const error = resultError(ErrorCode.NOT_FOUND, 'Patient not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Patient not found');
      expect(error.detail).toBeUndefined();
      expect(error.correlationId).toBeUndefined();
    });

    it('creates error with optional fields', () => {
      const error = resultError(ErrorCode.VALIDATION, 'Invalid', {
        detail: 'Field X is required',
        correlationId: 'abc-123',
        retryable: false,
        validationIssues: [{ field: 'name', message: 'Required' }],
      });
      expect(error.detail).toBe('Field X is required');
      expect(error.correlationId).toBe('abc-123');
      expect(error.retryable).toBe(false);
      expect(error.validationIssues).toHaveLength(1);
    });

    it('creates error with cause chain', () => {
      const cause = new Error('upstream failure');
      const error = resultError(ErrorCode.NETWORK, 'Service down', { cause });
      expect(error.cause).toBe(cause);
      expect(error.cause?.message).toBe('upstream failure');
    });

    it('creates error with multiple validation issues', () => {
      const issues = [
        { field: 'age', message: 'Must be positive', code: 'POSITIVE' },
        { field: 'name', message: 'Required', code: 'REQUIRED' },
        { field: 'email', message: 'Invalid format', code: 'FORMAT' },
      ];
      const error = resultError(ErrorCode.VALIDATION, 'Form invalid', {
        validationIssues: issues,
      });
      expect(error.validationIssues).toHaveLength(3);
      expect(error.validationIssues?.[0].field).toBe('age');
      expect(error.validationIssues?.[2].code).toBe('FORMAT');
    });

    it('creates error with retryable flag', () => {
      const error = resultError(ErrorCode.TIMEOUT, 'Timed out', { retryable: true });
      expect(error.retryable).toBe(true);
    });

    it('creates error with non-retryable flag', () => {
      const error = resultError(ErrorCode.UNAUTHORIZED, 'Bad token', { retryable: false });
      expect(error.retryable).toBe(false);
    });
  });

  describe('errorToHttpStatus', () => {
    it('maps VALIDATION to 400', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.VALIDATION, ''))).toBe(400);
    });

    it('maps NOT_FOUND to 404', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.NOT_FOUND, ''))).toBe(404);
    });

    it('maps CONFLICT to 409', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.CONFLICT, ''))).toBe(409);
    });

    it('maps UNAUTHORIZED to 401', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.UNAUTHORIZED, ''))).toBe(401);
    });

    it('maps FORBIDDEN to 403', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.FORBIDDEN, ''))).toBe(403);
    });

    it('maps NETWORK to 502', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.NETWORK, ''))).toBe(502);
    });

    it('maps TIMEOUT to 504', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.TIMEOUT, ''))).toBe(504);
    });

    it('maps RATE_LIMIT to 429', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.RATE_LIMIT, ''))).toBe(429);
    });

    it('maps DEPENDENCY_UNAVAILABLE to 503', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.DEPENDENCY_UNAVAILABLE, ''))).toBe(503);
    });

    it('maps AI_UNAVAILABLE to 503', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.AI_UNAVAILABLE, ''))).toBe(503);
    });

    it('maps AI_SAFETY_REJECTION to 422', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.AI_SAFETY_REJECTION, ''))).toBe(422);
    });

    it('maps DATABASE to 500', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.DATABASE, ''))).toBe(500);
    });

    it('maps INTERNAL to 500', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.INTERNAL, ''))).toBe(500);
    });

    it('maps CANCELLED to 499', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.CANCELLED, ''))).toBe(499);
    });

    it('maps STALE_VERSION to 409', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.STALE_VERSION, ''))).toBe(409);
    });

    it('maps UNKNOWN to 500', () => {
      expect(errorToHttpStatus(resultError(ErrorCode.UNKNOWN, ''))).toBe(500);
    });
  });

  describe('httpStatusToErrorCode', () => {
    it('maps 400 to VALIDATION', () => {
      expect(httpStatusToErrorCode(400)).toBe('VALIDATION');
    });

    it('maps 401 to UNAUTHORIZED', () => {
      expect(httpStatusToErrorCode(401)).toBe('UNAUTHORIZED');
    });

    it('maps 403 to FORBIDDEN', () => {
      expect(httpStatusToErrorCode(403)).toBe('FORBIDDEN');
    });

    it('maps 404 to NOT_FOUND', () => {
      expect(httpStatusToErrorCode(404)).toBe('NOT_FOUND');
    });

    it('maps 409 to CONFLICT', () => {
      expect(httpStatusToErrorCode(409)).toBe('CONFLICT');
    });

    it('maps 422 to AI_SAFETY_REJECTION', () => {
      expect(httpStatusToErrorCode(422)).toBe('AI_SAFETY_REJECTION');
    });

    it('maps 429 to RATE_LIMIT', () => {
      expect(httpStatusToErrorCode(429)).toBe('RATE_LIMIT');
    });

    it('maps 499 to CANCELLED', () => {
      expect(httpStatusToErrorCode(499)).toBe('CANCELLED');
    });

    it('maps 502 to NETWORK', () => {
      expect(httpStatusToErrorCode(502)).toBe('NETWORK');
    });

    it('maps 503 to DEPENDENCY_UNAVAILABLE', () => {
      expect(httpStatusToErrorCode(503)).toBe('DEPENDENCY_UNAVAILABLE');
    });

    it('maps 504 to TIMEOUT', () => {
      expect(httpStatusToErrorCode(504)).toBe('TIMEOUT');
    });

    it('maps unknown status to INTERNAL', () => {
      expect(httpStatusToErrorCode(999)).toBe('INTERNAL');
    });

    it('maps 500 to INTERNAL', () => {
      expect(httpStatusToErrorCode(500)).toBe('INTERNAL');
    });

    it('maps 300s to INTERNAL', () => {
      expect(httpStatusToErrorCode(301)).toBe('INTERNAL');
    });

    it('maps 0 to INTERNAL', () => {
      expect(httpStatusToErrorCode(0)).toBe('INTERNAL');
    });
  });

  describe('round-trip: errorToHttpStatus <-> httpStatusToErrorCode', () => {
    const roundTripCodes = [
      ErrorCode.VALIDATION,
      ErrorCode.NOT_FOUND,
      ErrorCode.CONFLICT,
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.NETWORK,
      ErrorCode.TIMEOUT,
      ErrorCode.RATE_LIMIT,
      ErrorCode.DEPENDENCY_UNAVAILABLE,
      ErrorCode.AI_SAFETY_REJECTION,
      ErrorCode.CANCELLED,
    ] as const;

    it.each(roundTripCodes)('%s round-trips through HTTP status', (code) => {
      const httpStatus = errorToHttpStatus(resultError(code, ''));
      const roundTripped = httpStatusToErrorCode(httpStatus);
      expect(roundTripped).toBe(code);
    });
  });

  describe('result usage patterns', () => {
    it('exhaustive switch on result type', () => {
      const results: Array<Result<number>> = [ok(1), err(resultError(ErrorCode.INTERNAL, 'fail'))];
      
      results.forEach((result) => {
        if (isOk(result)) {
          expect(typeof result.data).toBe('number');
        } else if (isErr(result)) {
          expect(result.error.code).toBeTruthy();
        }
      });
    });

    it('can compose results', () => {
      function divide(a: number, b: number): Result<number> {
        if (b === 0) return err(resultError(ErrorCode.VALIDATION, 'Cannot divide by zero'));
        return ok(a / b);
      }

      const success = divide(10, 2);
      expect(isOk(success)).toBe(true);
      if (isOk(success)) expect(success.data).toBe(5);

      const failure = divide(10, 0);
      expect(isErr(failure)).toBe(true);
      if (isErr(failure)) expect(failure.error.code).toBe('VALIDATION');
    });

    it('can chain results with map-like pattern', () => {
      function parseAge(input: string): Result<number> {
        const n = Number(input);
        if (Number.isNaN(n)) return err(resultError(ErrorCode.VALIDATION, 'Not a number'));
        if (n < 0 || n > 150) return err(resultError(ErrorCode.VALIDATION, 'Out of range'));
        return ok(n);
      }

      expect(isOk(parseAge('25'))).toBe(true);
      expect(isErr(parseAge('abc'))).toBe(true);
      expect(isErr(parseAge('-5'))).toBe(true);
    });

    it('can nest results (Result<Result<T>>)', () => {
      const inner = ok('value');
      const outer = ok(inner);
      expect(isOk(outer)).toBe(true);
      if (isOk(outer)) {
        expect(isOk(outer.data)).toBe(true);
        if (isOk(outer.data)) {
          expect(outer.data.data).toBe('value');
        }
      }
    });

    it('error carries validation issues for form validation', () => {
      const error = resultError(ErrorCode.VALIDATION, 'Form invalid', {
        validationIssues: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'age', message: 'Must be at least 18', code: 'MIN_AGE' },
        ],
      });
      const result = err(error);
      if (isErr(result)) {
        expect(result.error.validationIssues).toHaveLength(2);
        expect(result.error.validationIssues?.[0].field).toBe('email');
      }
    });

    it('error with correlationId for distributed tracing', () => {
      const error = resultError(ErrorCode.INTERNAL, 'Server error', {
        correlationId: 'trace-abc-123',
      });
      const result = err(error);
      if (isErr(result)) {
        expect(result.error.correlationId).toBe('trace-abc-123');
      }
    });
  });
});
