/**
 * System Configuration Context
 * Provides system-level configuration to frontend components
 * Manages RAG status, session timeouts, AI usage, subscription, tools
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from './UserContext';
import configService from '../services/configService';
import logger from '../utils/logger';


const SystemConfigContext = createContext();

const DEFAULT_SYSTEM_CONFIG = Object.freeze({
  rag: { enabled: false, topK: 5, minScore: 0.7 },
  session: { idleTimeoutMs: 1800000, absoluteTimeoutMs: 28800000 },
});

const DEFAULT_AI_USAGE = Object.freeze({
  tier: 'free',
  dailyLimit: 10,
  usedToday: 0,
  remaining: 10,
  resetAt: new Date(Date.now() + 86400000).toISOString(),
});

const DEFAULT_SUBSCRIPTION = Object.freeze({
  tier: 'free',
  status: 'active',
});

const stripMeta = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { value: payload, meta: null };
  }
  const { _meta, ...value } = payload;
  return { value, meta: _meta };
};

export function SystemConfigProvider({ children }) {
  const { isAuthenticated, isLoading: isUserLoading } = useUser();
  const [systemConfig, setSystemConfig] = useState(DEFAULT_SYSTEM_CONFIG);
  const [aiUsage, setAiUsage] = useState(DEFAULT_AI_USAGE);
  const [availableTools, setAvailableTools] = useState([]);
  const [subscription, setSubscription] = useState(DEFAULT_SUBSCRIPTION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configDegraded, setConfigDegraded] = useState(false);

  const loadSystemConfig = useCallback(async () => {
    if (isUserLoading) return;

    if (!isAuthenticated) {
      setSystemConfig(DEFAULT_SYSTEM_CONFIG);
      setAiUsage(DEFAULT_AI_USAGE);
      setAvailableTools([]);
      setSubscription(DEFAULT_SUBSCRIPTION);
      setConfigDegraded(false);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Config load timeout')), 5000),
      );

      const [configRaw, usageRaw, toolsRaw, subRaw] = await Promise.race([
        Promise.all([
          configService.getSystemConfig(),
          configService.getAIRemainingQueries(),
          configService.getAvailableTools(),
          configService.getCurrentSubscription(),
        ]),
        timeoutPromise,
      ]);

      const config = stripMeta(configRaw);
      const usage = stripMeta(usageRaw);
      const tools = stripMeta(toolsRaw);
      const sub = stripMeta(subRaw);

      const degraded =
        config.meta?.fromDefaults ||
        usage.meta?.fromDefaults ||
        tools.meta?.fromDefaults ||
        sub.meta?.fromDefaults;

      setConfigDegraded(Boolean(degraded));
      if (degraded) {
        const messages = [config.meta, usage.meta, tools.meta, sub.meta]
          .filter((m) => m?.error)
          .map((m) => m.error);
        setError(messages[0] || 'API configuration unavailable');
      }

      setSystemConfig(config.value || DEFAULT_SYSTEM_CONFIG);
      setAiUsage(usage.value || DEFAULT_AI_USAGE);
      setAvailableTools(tools.value?.tools ?? tools.value ?? []);
      setSubscription(sub.value || DEFAULT_SUBSCRIPTION);
    } catch (err) {
      logger.warn('Failed to load system config (using defaults)', { message: err.message });
      setError(err.message);
      setConfigDegraded(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isUserLoading]);

  useEffect(() => {
    loadSystemConfig();
  }, [loadSystemConfig]);

  useEffect(() => {
    if (isUserLoading || !isAuthenticated || loading || configDegraded) {
      return undefined;
    }

    const interval = setInterval(async () => {
      const usageRaw = await configService.getAIRemainingQueries();
      const { value } = stripMeta(usageRaw);
      if (value) setAiUsage(value);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [configDegraded, isAuthenticated, isUserLoading, loading]);

  const value = {
    systemConfig,
    aiUsage,
    availableTools,
    subscription,
    loading,
    error,
    configDegraded,
    refresh: loadSystemConfig,
    isRagEnabled: systemConfig?.rag?.enabled ?? false,
    sessionConfig: systemConfig?.session,
  };

  return <SystemConfigContext.Provider value={value}>{children}</SystemConfigContext.Provider>;
}

export function useSystemConfig() {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error('useSystemConfig must be used within SystemConfigProvider');
  }
  return context;
}

export default SystemConfigContext;
