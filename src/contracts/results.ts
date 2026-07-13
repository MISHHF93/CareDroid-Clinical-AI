/**
 * Canonical result type for operations that can fail.
 * Use this instead of throwing exceptions for expected domain failures.
 */

/** Discriminated success variant */
export type ResultSuccess<T> = {
  readonly ok: true;
  readonly data: T;
  readonly timestamp: string;
};

/** Discriminated failure variant */
export type ResultFailure<E = ResultError> = {
  readonly ok: false;
  readonly error: E;
  readonly timestamp: string;
};

/** Union type: success or failure */
export type Result<T, E = ResultError> = ResultSuccess<T> | ResultFailure<E>;

/** Create a success result */
export function ok<T>(data: T): ResultSuccess<T> {
  return { ok: true, data, timestamp: new Date().toISOString() };
}

/** Create a failure result */
export function err<E = ResultError>(error: E): ResultFailure<E> {
  return { ok: false, error, timestamp: new Date().toISOString() };
}

/** Type guard: is this a success result? */
export function isOk<T, E>(result: Result<T, E>): result is ResultSuccess<T> {
  return result.ok;
}

/** Type guard: is this a failure result? */
export function isErr<T, E>(result: Result<T, E>): result is ResultFailure<E> {
  return !result.ok;
}

/**
 * Exhaustive check for result handling.
 * Use in switch statements to ensure all variants are handled.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

/** Standard error codes */
export const ErrorCode = {
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
  DATABASE: 'DATABASE',
  INTERNAL: 'INTERNAL',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  AI_SAFETY_REJECTION: 'AI_SAFETY_REJECTION',
  CANCELLED: 'CANCELLED',
  STALE_VERSION: 'STALE_VERSION',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Standard result error */
export type ResultError = {
  readonly code: ErrorCode;
  readonly message: string;
  readonly detail?: string;
  readonly correlationId?: string;
  readonly retryable?: boolean;
  readonly cause?: Error;
  readonly validationIssues?: ReadonlyArray<ValidationIssue>;
};

/** Validation issue for form/field errors */
export type ValidationIssue = {
  readonly field: string;
  readonly message: string;
  readonly code?: string;
};

/** Create a typed result error */
export function resultError(
  code: ErrorCode,
  message: string,
  options?: {
    detail?: string;
    correlationId?: string;
    retryable?: boolean;
    cause?: Error;
    validationIssues?: ReadonlyArray<ValidationIssue>;
  },
): ResultError {
  return { code, message, ...options };
}

/** RFC 9457 Problem Details envelope for API responses */
export type ProblemDetails = {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly errorCode?: ErrorCode;
  readonly correlationId?: string;
  readonly retryable?: boolean;
  readonly validationIssues?: ReadonlyArray<ValidationIssue>;
};

/** Map a ResultError to HTTP status code */
export function errorToHttpStatus(error: ResultError): number {
  const map: Record<ErrorCode, number> = {
    VALIDATION: 400,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NETWORK: 502,
    TIMEOUT: 504,
    RATE_LIMIT: 429,
    DEPENDENCY_UNAVAILABLE: 503,
    DATABASE: 500,
    INTERNAL: 500,
    AI_UNAVAILABLE: 503,
    AI_SAFETY_REJECTION: 422,
    CANCELLED: 499,
    STALE_VERSION: 409,
    UNKNOWN: 500,
  };
  return map[error.code] ?? 500;
}

/** Map HTTP status to ErrorCode */
export function httpStatusToErrorCode(status: number): ErrorCode {
  if (status === 400) return ErrorCode.VALIDATION;
  if (status === 401) return ErrorCode.UNAUTHORIZED;
  if (status === 403) return ErrorCode.FORBIDDEN;
  if (status === 404) return ErrorCode.NOT_FOUND;
  if (status === 409) return ErrorCode.CONFLICT;
  if (status === 422) return ErrorCode.AI_SAFETY_REJECTION;
  if (status === 429) return ErrorCode.RATE_LIMIT;
  if (status === 499) return ErrorCode.CANCELLED;
  if (status === 502) return ErrorCode.NETWORK;
  if (status === 503) return ErrorCode.DEPENDENCY_UNAVAILABLE;
  if (status === 504) return ErrorCode.TIMEOUT;
  return ErrorCode.INTERNAL;
}
