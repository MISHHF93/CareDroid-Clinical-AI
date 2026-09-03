import { dispatchAlert } from '../engine/alertEngine';
import logger from '../utils/logger';
import {
  ErrorCode,
  httpStatusToErrorCode,
  resultError,
  type ResultError,
} from '../contracts/results';

const DEFAULT_ERROR_MESSAGE = 'Unable to reach the API. Try again or check backend availability.';

export function sanitizeApiError(error: unknown) {
  const err = error as {
    name?: string;
    message?: string;
    status?: number;
    response?: { status?: number };
  };
  return {
    name: err?.name || 'Error',
    message: err?.message || DEFAULT_ERROR_MESSAGE,
    status: err?.status || err?.response?.status || 0,
  };
}

/** Stage C: map API failures into canonical ResultError taxonomy. */
export function apiFailureToResultError(
  error: unknown,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
): ResultError {
  const sanitized = sanitizeApiError(error);
  const status = sanitized.status;
  const code = status > 0 ? httpStatusToErrorCode(status) : ErrorCode.NETWORK;
  return resultError(code, sanitized.message || fallbackMessage, {
    detail: status ? `http_${status}` : 'network',
    retryable: status === 0 || status === 429 || status === 503 || status === 504,
  });
}

export function reportApiError({
  title = 'API request failed',
  message = DEFAULT_ERROR_MESSAGE,
  error,
  endpoint,
  severity = 'Warning',
}: any = {}) {
  const sanitized = sanitizeApiError(error);
  logger.error(title, { endpoint, error: sanitized });
  dispatchAlert({
    type: 'System',
    severity,
    title,
    message,
  });
  return sanitized;
}
