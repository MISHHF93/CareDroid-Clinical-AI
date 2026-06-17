import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

export const INTEROPERABILITY_API_ENDPOINTS = Object.freeze({
  summary: '/api/interoperability/summary',
  events: '/api/interoperability/events',
});

async function requestInteroperabilityJson(path, options = {}) {
  try {
    const response = await apiFetch(path, options);
    return await parseApiResponse(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export const fetchInteroperabilitySummary = () =>
  requestInteroperabilityJson(INTEROPERABILITY_API_ENDPOINTS.summary);

export const fetchIntegrationEvents = (limit = 25) => {
  const query = Number.isFinite(limit) ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return requestInteroperabilityJson(`${INTEROPERABILITY_API_ENDPOINTS.events}${query}`);
};

export const fetchIntegrationEventTrace = (eventId) =>
  requestInteroperabilityJson(
    `${INTEROPERABILITY_API_ENDPOINTS.events}/${encodeURIComponent(eventId)}`,
  );
