/**
 * Configuration Service
 * Fetches system-level configuration from backend via centralized apiClient.
 */

import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { API_ROUTES } from '../config/api.config';
import logger from '../utils/logger';

const SYSTEM_CONFIG_DEFAULTS = {
  environment: {
    name: 'development',
    allowed: ['local', 'development', 'staging', 'production'],
    bannerEnabled: true,
    isProduction: false,
    validation: { valid: true, source: 'frontend-defaults' },
  },
  deployment: {
    id: null,
    region: null,
    version: '1.0.0',
    commit: null,
    branch: null,
    deployedAt: null,
  },
  rag: {
    enabled: false,
    topK: 5,
    minScore: 0.7,
  },
  session: {
    idleTimeoutMs: 1800000,
    absoluteTimeoutMs: 28800000,
  },
};

const AI_USAGE_DEFAULTS = {
  tier: 'free',
  dailyLimit: 10,
  usedToday: 0,
  remaining: 10,
  resetAt: new Date(Date.now() + 86400000).toISOString(),
};

const TOOLS_DEFAULTS = {
  tools: [],
  count: 0,
  tier: 'free',
};

async function fetchConfigEndpoint(path, defaults) {
  try {
    const { response, data } = await apiFetchJson(path);
    if (!response.ok) {
      const message = getApiErrorMessage(null, response);
      logger.error(`Config fetch failed: ${path}`, { status: response.status, message });
      return { ok: false, data: defaults, error: message, fromDefaults: true };
    }
    return { ok: true, data, fromDefaults: false };
  } catch (error) {
    const message = getApiErrorMessage(error);
    logger.error(`Config fetch error: ${path}`, { error: message });
    return { ok: false, data: defaults, error: message, fromDefaults: true };
  }
}

class ConfigService {
  async getSystemConfig() {
    const result = await fetchConfigEndpoint(API_ROUTES.config.system, SYSTEM_CONFIG_DEFAULTS);
    return { ...result.data, _meta: { ok: result.ok, error: result.error, fromDefaults: result.fromDefaults } };
  }

  async getAIRemainingQueries() {
    const result = await fetchConfigEndpoint(API_ROUTES.ai.remainingQueries, AI_USAGE_DEFAULTS);
    return { ...result.data, _meta: { ok: result.ok, error: result.error, fromDefaults: result.fromDefaults } };
  }

  async getAvailableTools() {
    const result = await fetchConfigEndpoint(API_ROUTES.tools.available, TOOLS_DEFAULTS);
    return { ...result.data, _meta: { ok: result.ok, error: result.error, fromDefaults: result.fromDefaults } };
  }

  async getCurrentSubscription() {
    const result = await fetchConfigEndpoint(API_ROUTES.subscriptions.current, null);
    if (!result.ok) {
      return { tier: 'free', status: 'active', _meta: { ok: false, error: result.error, fromDefaults: true } };
    }
    return { ...(result.data || { tier: 'free', status: 'active' }), _meta: { ok: true, fromDefaults: false } };
  }

  async getSubscriptionPlans() {
    const result = await fetchConfigEndpoint(API_ROUTES.subscriptions.plans, []);
    return result.data;
  }
}

export default new ConfigService();
