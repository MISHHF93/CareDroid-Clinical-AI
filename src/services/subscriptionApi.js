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

export async function fetchSubscriptionLifecycle() {
  try {
    const response = await apiFetch('/api/subscriptions/lifecycle');
    const data = await parseJson(response, null);
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}

export async function resolveSubscriptionEntitlement({ requiredTier, featureId } = {}) {
  if (!requiredTier) return disabled('Required subscription tier is required.');

  try {
    const response = await apiFetch('/api/subscriptions/entitlements/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requiredTier, featureId }),
    });
    const data = await parseJson(response, null);
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}

export async function fetchBillingOverview() {
  try {
    const response = await apiFetch('/api/subscriptions/billing');
    const data = await parseJson(response, null);
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}

export async function fetchUsageSummary({ period = 'month' } = {}) {
  try {
    const response = await apiFetch(`/api/subscriptions/usage?period=${encodeURIComponent(period)}`);
    const data = await parseJson(response, null);
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}

export async function fetchUsageMeteringFramework({ period = 'month' } = {}) {
  try {
    const response = await apiFetch(
      `/api/subscriptions/usage/metering?period=${encodeURIComponent(period)}`
    );
    const data = await parseJson(response, null);
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}

export async function recordUsageEvent(payload = {}) {
  if (!payload.eventType) return disabled('Usage event type is required.');

  try {
    const response = await apiFetch('/api/subscriptions/usage/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

async function postPlanTransition(path, { targetTier, reason } = {}) {
  if (!targetTier) return disabled('Target subscription tier is required.');

  try {
    const response = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetTier, reason }),
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

export function upgradeSubscription({ targetTier, reason } = {}) {
  return postPlanTransition('/api/subscriptions/upgrade', { targetTier, reason });
}

export function downgradeSubscription({ targetTier, reason } = {}) {
  return postPlanTransition('/api/subscriptions/downgrade', { targetTier, reason });
}

export function convertTrialSubscription({ targetTier, reason } = {}) {
  return postPlanTransition('/api/subscriptions/trial/convert', { targetTier, reason });
}
