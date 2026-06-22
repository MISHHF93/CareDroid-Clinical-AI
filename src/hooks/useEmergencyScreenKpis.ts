import { useMemo } from 'react';
import {
  buildScreenModeKpiSnapshot,
  filterOperationalMetricsByScreenMode,
  resolveChargeNurseStripMetricIds,
  resolveChargeNurseStripSurfaces,
  resolveCommandCenterMetricIds,
  resolveCommandCenterWidgetVisibility,
  resolveHeaderOperationalMetricKeys,
  resolvePublicWaitingKpiWidgets,
  resolveReceptionStripMetricIds,
  resolveScreenModeKpiIds,
  resolveTriageStripMetricIds,
  type EmergencyScreenKpiSnapshot,
} from '../config/emergencyScreenKpiPolicy';
import type { CareDroidScreenMode } from '../config/careDroidScreenModes';
import useRouteScreenMode from './useRouteScreenMode';
import { useOperationalIntelligence } from './useOperationalIntelligence';
import { useEmergencyStore } from '../store/emergencyStore';

export type EmergencyScreenKpis = EmergencyScreenKpiSnapshot & {
  screenMode: CareDroidScreenMode;
  kpiIds: ReturnType<typeof resolveScreenModeKpiIds>;
  receptionStripMetricIds: string[] | null;
  triageStripMetricIds: string[] | null;
  chargeNurseStripMetricIds: string[] | null;
  chargeNurseStripSurfaces: string[] | null;
  headerOperationalMetricKeys: string[] | null;
  publicWaitingWidgets: string[] | null;
  commandCenterMetricIds: ReturnType<typeof resolveCommandCenterMetricIds>;
  commandCenterWidgetVisibility: ReturnType<typeof resolveCommandCenterWidgetVisibility>;
  headerOperationalMetrics: Array<{
    key: string;
    label: string;
    value: string | number;
    tone?: string;
    source?: string;
  }>;
};

export function useEmergencyScreenKpis(
  screenMode: CareDroidScreenMode | null = null,
): EmergencyScreenKpis {
  const routeScreenMode = useRouteScreenMode();
  const resolvedScreenMode = screenMode || routeScreenMode;
  const patients = useEmergencyStore((store) => store.patients);
  const emsArrivals = useEmergencyStore((store) => store.emsArrivals);
  const emergencySettings = useEmergencyStore((store) => store.emergencySettings);
  const operationalIntelligence = useOperationalIntelligence({ screenMode: resolvedScreenMode });
  const centralSnapshot = operationalIntelligence.centralSnapshot;
  const emsInbound = centralSnapshot.emsPressure?.inbound ?? 0;
  const operationalMetrics = centralSnapshot.operationalSummary?.metrics || [];

  return useMemo(() => {
    const snapshot = buildScreenModeKpiSnapshot({
      screenMode: resolvedScreenMode,
      patients,
      emsInbound,
      emsArrivals,
      settings: emergencySettings,
      operationalMetrics,
    });

    const headerKeys = resolveHeaderOperationalMetricKeys(resolvedScreenMode);
    const headerOperationalMetrics = headerKeys
      ? filterOperationalMetricsByScreenMode(operationalMetrics, resolvedScreenMode)
      : operationalMetrics;

    return {
      ...snapshot,
      screenMode: resolvedScreenMode,
      kpiIds: resolveScreenModeKpiIds(resolvedScreenMode),
      receptionStripMetricIds: resolveReceptionStripMetricIds(resolvedScreenMode),
      triageStripMetricIds: resolveTriageStripMetricIds(resolvedScreenMode),
      chargeNurseStripMetricIds: resolveChargeNurseStripMetricIds(resolvedScreenMode),
      chargeNurseStripSurfaces: resolveChargeNurseStripSurfaces(resolvedScreenMode),
      headerOperationalMetricKeys: headerKeys,
      publicWaitingWidgets: resolvePublicWaitingKpiWidgets(resolvedScreenMode),
      commandCenterMetricIds: resolveCommandCenterMetricIds(resolvedScreenMode),
      commandCenterWidgetVisibility: resolveCommandCenterWidgetVisibility(resolvedScreenMode),
      headerOperationalMetrics,
    };
  }, [
    emsArrivals,
    emsInbound,
    emergencySettings,
    operationalMetrics,
    patients,
    resolvedScreenMode,
  ]);
}

export default useEmergencyScreenKpis;
