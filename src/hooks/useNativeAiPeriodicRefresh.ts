import { useEffect, useState } from 'react';
import { DEFAULT_NATIVE_AI_THRESHOLDS } from '../config/nativeAiThresholds.config';

/**
 * Triggers native AI snapshot recomputation on a clinical refresh cadence (default 20 min).
 * Downstream useMemo hooks should depend on `refreshTick` to recalculate ML scores.
 */
export function useNativeAiPeriodicRefresh(intervalMinutes = DEFAULT_NATIVE_AI_THRESHOLDS.mlRefreshIntervalMinutes) {
  const [refreshTick, setRefreshTick] = useState(() => Date.now());

  useEffect(() => {
    const intervalMs = Math.max(5, intervalMinutes) * 60_000;
    const timer = window.setInterval(() => {
      setRefreshTick(Date.now());
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMinutes]);

  return refreshTick;
}