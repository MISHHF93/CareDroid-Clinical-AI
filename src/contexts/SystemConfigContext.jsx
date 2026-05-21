/**
 * System Configuration Context
 * Provides system-level configuration to frontend components
 * Manages RAG status, session timeouts, AI usage, subscription, tools
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import configService from '../services/configService';
import logger from '../utils/logger';
import ApiConfigDegradedBanner from '../components/ApiConfigDegradedBanner';

const SystemConfigContext = createContext();

const stripMeta = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { value: payload, meta: null };
  }
  const { _meta, ...value } = payload;
  return { value, meta: _meta };
};

export function SystemConfigProvider({ children }) {
  const [systemConfig, setSystemConfig] = useState({
    rag: { enabled: false, topK: 5, minScore: 0.7 },
    session: { idleTimeoutMs: 1800000, absoluteTimeoutMs: 28800000 },
  });
  const [aiUsage, setAiUsage] = useState({
    tier: 'free',
    dailyLimit: 10,
    usedToday: 0,
    remaining: 10,
    resetAt: new Date(Date.now() + 86400000).toISOString(),
  });
  const [availableTools, setAvailableTools] = useState([]);
  const [subscription, setSubscription] = useState({
    tier: 'free',
    status: 'active',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configDegraded, setConfigDegraded] = useState(false);

  const loadSystemConfig = useCallback(async () => {
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

      setSystemConfig(config.value || systemConfig);
      setAiUsage(usage.value || aiUsage);
      setAvailableTools(tools.value?.tools ?? tools.value ?? []);
      setSubscription(sub.value || { tier: 'free', status: 'active' });
    } catch (err) {
      logger.warn('Failed to load system config (using defaults)', { message: err.message });
      setError(err.message);
      setConfigDegraded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystemConfig();

    const interval = setInterval(async () => {
      const usageRaw = await configService.getAIRemainingQueries();
      const { value } = stripMeta(usageRaw);
      if (value) setAiUsage(value);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadSystemConfig]);

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

  return (
    <SystemConfigContext.Provider value={value}>
      <ApiConfigDegradedBanner />
      {children}
    </SystemConfigContext.Provider>
  );
}

export function useSystemConfig() {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error('useSystemConfig must be used within SystemConfigProvider');
  }
  return context;
}

export default SystemConfigContext;
