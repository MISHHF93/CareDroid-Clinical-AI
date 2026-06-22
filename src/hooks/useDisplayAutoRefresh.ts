import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildDisplayRefreshStatus,
  resolveDisplayRefreshIntervalMs,
  summarizeDisplayRefreshErrors,
  type DisplayRefreshSettingsInput,
  type DisplayRefreshStatus,
} from '../config/displayAutoRefreshModel';
import type { CareDroidScreenMode } from '../config/careDroidScreenModes';
import type { EmergencyDashboardRefreshResult } from '../store/emergencyStore';

export function useStableDisplaySnapshot<T>(snapshot: T | null | undefined): T | null {
  const cacheRef = useRef<T | null>(null);
  if (snapshot) {
    cacheRef.current = snapshot;
  }
  return snapshot ?? cacheRef.current;
}

type UseDisplayAutoRefreshOptions = {
  enabled: boolean;
  screenMode: CareDroidScreenMode | string;
  settings?: DisplayRefreshSettingsInput;
  contentUpdatedAt?: string | null;
  hasContent?: boolean;
  onRefresh: () => Promise<EmergencyDashboardRefreshResult | void>;
};

export function useDisplayAutoRefresh({
  enabled,
  screenMode,
  settings = {},
  contentUpdatedAt = null,
  hasContent = false,
  onRefresh,
}: UseDisplayAutoRefreshOptions): DisplayRefreshStatus {
  const refreshIntervalMs = resolveDisplayRefreshIntervalMs(screenMode, settings);
  const [lastSuccessfulAt, setLastSuccessfulAt] = useState<string | null>(contentUpdatedAt);
  const [lastAttemptAt, setLastAttemptAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasCachedContentRef = useRef(hasContent);

  if (hasContent) {
    hasCachedContentRef.current = true;
  }

  useEffect(() => {
    if (contentUpdatedAt) {
      setLastSuccessfulAt(contentUpdatedAt);
      setErrorMessage(null);
    }
  }, [contentUpdatedAt]);

  const runRefresh = useCallback(async () => {
    if (!enabled) return;
    setIsRefreshing(true);
    setLastAttemptAt(new Date().toISOString());
    try {
      const result = await onRefresh();
      const summary = summarizeDisplayRefreshErrors(
        result && typeof result === 'object' && 'errors' in result
          ? (result as EmergencyDashboardRefreshResult)
          : null,
      );
      if (summary) {
        setErrorMessage(summary);
      } else {
        setErrorMessage(null);
        setLastSuccessfulAt(new Date().toISOString());
      }
    } catch (error) {
      setErrorMessage(summarizeDisplayRefreshErrors(null, error));
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled, onRefresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    void runRefresh();
    const timer = window.setInterval(() => {
      void runRefresh();
    }, refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, refreshIntervalMs, runRefresh]);

  return buildDisplayRefreshStatus({
    enabled,
    refreshIntervalMs,
    lastUpdatedAt: lastSuccessfulAt || contentUpdatedAt || null,
    lastAttemptAt,
    isRefreshing,
    errorMessage,
    hasCachedContent: hasCachedContentRef.current || Boolean(hasContent),
  });
}

export default useDisplayAutoRefresh;
