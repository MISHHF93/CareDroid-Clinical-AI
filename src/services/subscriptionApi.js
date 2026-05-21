import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

function disabled(message) {
  return { ok: false, data: null, message };
}

async function parseJson(response, fallback = {}) {
  try {
    return await parseApiResponse(response, { fallback });
  } catch {
    return fallback;
  }
}

export async function fetchSubscriptionPlans() {
  try {
    const response = await apiFetch('/api/subscriptions/plans');
    const data = await parseJson(response, []);
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data: Array.isArray(data) ? data : [], message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}

export async function fetchCurrentSubscription() {
  try {
    const response = await apiFetch('/api/subscriptions/current');
    const data = await parseJson(response, null);
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}

export async function createCheckoutSession({ tier, successUrl, cancelUrl } = {}) {
  if (!tier) return disabled('Select a backend-returned plan before checkout.');

  try {
    const response = await apiFetch('/api/subscriptions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, successUrl, cancelUrl }),
    });
    const data = await parseJson(response, {});
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}

export async function createCustomerPortalSession({ returnUrl } = {}) {
  try {
    const response = await apiFetch('/api/subscriptions/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUrl }),
    });
    const data = await parseJson(response, {});
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}
