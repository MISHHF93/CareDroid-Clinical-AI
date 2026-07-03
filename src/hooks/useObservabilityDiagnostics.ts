import { useEffect, useState } from 'react';
import type { ObservabilityDiagnosticsSnapshot } from '../config/observabilityModel';
import observabilityService from '../services/observabilityService';

export function useObservabilityDiagnostics(refreshMs = 15_000) {
  const [snapshot, setSnapshot] = useState<ObservabilityDiagnosticsSnapshot>(() =>
    observabilityService.buildDiagnosticsSnapshot(),
  );

  useEffect(() => {
    const refresh = () => setSnapshot(observabilityService.buildDiagnosticsSnapshot());
    refresh();
    const timer = setInterval(refresh, refreshMs);
    return () => clearInterval(timer);
  }, [refreshMs]);

  return snapshot;
}