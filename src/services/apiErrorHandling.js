import { dispatchAlert } from '../engine/alertEngine';
import logger from '../utils/logger';

const DEFAULT_ERROR_MESSAGE = 'Unable to reach the API. Try again or check backend availability.';

export function sanitizeApiError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || DEFAULT_ERROR_MESSAGE,
    status: error?.status || error?.response?.status || 0,
  };
}

export function reportApiError({
  title = 'API request failed',
  message = DEFAULT_ERROR_MESSAGE,
  error,
  endpoint,
  severity = 'Warning',
} = {}) {
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
