import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Patient } from '../types/emergency';
import { buildClinicalAcuityLeaderboard } from '../services/nativeAiCore';
import {
  fetchClinicalAcuityLeaderboard,
  fetchNativeAiDriftEnvelope,
  fetchNativeAiRegistry,
} from '../services/nativeAiApi';
import { ensureDevBackendSession } from '../services/devBackendAuth';

export type NativeAiDataSource = 'api' | 'local' | 'loading';

type NativeAiDashboardData = {
  acuityEntries: ReturnType<typeof buildClinicalAcuityLeaderboard>;
  acuitySource: NativeAiDataSource;
  registrySource: NativeAiDataSource;
  driftSource: NativeAiDataSource;
  registryModelCount: number;
  driftAlertCount: number;
  connectionError: string;
  refresh: () => Promise<void>;
};

function normalizeAcuityEntries(payload: unknown): ReturnType<typeof buildClinicalAcuityLeaderboard> {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { entries?: unknown[] }).entries)) {
    return (payload as { entries: ReturnType<typeof buildClinicalAcuityLeaderboard> }).entries;
  }
  return [];
}

function extractRegistryModels(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.models)) return root.models;
  if (root.data && typeof root.data === 'object' && Array.isArray((root.data as { models?: unknown[] }).models)) {
    return (root.data as { models: unknown[] }).models;
  }
  return [];
}

function extractDriftAlerts(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.alerts)) return root.alerts;
  if (root.data && typeof root.data === 'object' && Array.isArray((root.data as { alerts?: unknown[] }).alerts)) {
    return (root.data as { alerts: unknown[] }).alerts;
  }
  return [];
}

export function useNativeAiDashboardData(
  patients: Patient[],
  enabled = true,
): NativeAiDashboardData {
  const localAcuity = useMemo(() => buildClinicalAcuityLeaderboard(patients), [patients]);
  const [acuityEntries, setAcuityEntries] = useState(localAcuity);
  const [acuitySource, setAcuitySource] = useState<NativeAiDataSource>('loading');
  const [registrySource, setRegistrySource] = useState<NativeAiDataSource>('loading');
  const [driftSource, setDriftSource] = useState<NativeAiDataSource>('loading');
  const [registryModelCount, setRegistryModelCount] = useState(0);
  const [driftAlertCount, setDriftAlertCount] = useState(0);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    setAcuityEntries(localAcuity);
  }, [localAcuity]);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setAcuitySource('loading');
    setRegistrySource('loading');
    setDriftSource('loading');
    setConnectionError('');

    await ensureDevBackendSession();

    const results = await Promise.allSettled([
      fetchClinicalAcuityLeaderboard(patients),
      fetchNativeAiRegistry(),
      fetchNativeAiDriftEnvelope(),
    ]);

    const [acuityResult, registryResult, driftResult] = results;

    if (acuityResult.status === 'fulfilled') {
      const entries = normalizeAcuityEntries(acuityResult.value);
      if (entries.length) {
        setAcuityEntries(entries);
        setAcuitySource('api');
      } else {
        setAcuityEntries(localAcuity);
        setAcuitySource('local');
      }
    } else {
      setAcuityEntries(localAcuity);
      setAcuitySource('local');
    }

    if (registryResult.status === 'fulfilled') {
      const models = extractRegistryModels(registryResult.value);
      setRegistryModelCount(models.length);
      setRegistrySource('api');
    } else {
      setRegistryModelCount(0);
      setRegistrySource('local');
    }

    if (driftResult.status === 'fulfilled') {
      const alerts = extractDriftAlerts(driftResult.value);
      setDriftAlertCount(alerts.length);
      setDriftSource('api');
    } else {
      setDriftAlertCount(0);
      setDriftSource('local');
    }

    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length === results.length) {
      setConnectionError('Native AI backend unavailable; showing client-side scores.');
    } else if (failures.length > 0) {
      setConnectionError('Some Native AI endpoints fell back to local computation.');
    }
  }, [enabled, localAcuity, patients]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    acuityEntries,
    acuitySource,
    registrySource,
    driftSource,
    registryModelCount,
    driftAlertCount,
    connectionError,
    refresh,
  };
}