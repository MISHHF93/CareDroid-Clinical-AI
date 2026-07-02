import { summarizeHospitalMapSnapshot } from '../services/hospitalMapService';

export type OperationsSurfaceMetric = Readonly<{ label: string; value: string }>;

export type OperationsLiveFeeds = Readonly<{
  capacity?: {
    units?: readonly { status?: string }[];
    availableBeds?: number;
    boardingPatients?: number;
  } | null;
  hospitalMap?: {
    snapshot?: {
      devices?: readonly unknown[];
      alerts?: readonly { status?: string }[];
      rooms?: readonly unknown[];
    };
  } | null;
  medicalIot?: {
    snapshot?: {
      devices?: readonly { status?: string; freshness?: string }[];
      alerts?: readonly unknown[];
      connectivityTimeline?: readonly { online?: number; warning?: number; offline?: number }[];
    };
  } | null;
  fleet?: {
    summary?: {
      availableVehicles?: number;
      maintenanceCount?: number;
      totalVehicles?: number;
    };
    alerts?: readonly unknown[];
  } | null;
  platformHealth?: {
    saas?: {
      data?: {
        summary?: { healthy?: number; total?: number; warning?: number; critical?: number };
      };
    };
  } | null;
  clinicalAlerts?: {
    ok?: boolean;
    data?: { alerts?: readonly { status?: string }[] };
  } | null;
}>;

function metric(label: string, value: number | string | null | undefined): OperationsSurfaceMetric {
  return { label, value: value == null || value === '' ? '—' : String(value) };
}

export function buildLiveSurfaceMetrics(
  surfaceId: string,
  feeds: OperationsLiveFeeds = {},
): OperationsSurfaceMetric[] | null {
  switch (surfaceId) {
    case 'hospital-map': {
      const units = feeds.capacity?.units || [];
      const mapSummary = feeds.hospitalMap?.snapshot
        ? summarizeHospitalMapSnapshot(feeds.hospitalMap.snapshot)
        : null;
      return [
        metric('Units visible', units.length || mapSummary?.rooms),
        metric('Available beds', feeds.capacity?.availableBeds),
        metric(
          'Active alerts',
          mapSummary?.activeAlerts ??
            (feeds.hospitalMap?.snapshot?.alerts || []).filter(
              (alert) => (alert.status || 'active') === 'active',
            ).length,
        ),
        metric('Boarding patients', feeds.capacity?.boardingPatients),
      ];
    }
    case 'medical-iot': {
      const devices = feeds.medicalIot?.snapshot?.devices || [];
      const online = devices.filter((device) => device.status === 'online').length;
      const stale = devices.filter(
        (device) => device.freshness === 'stale' || device.status === 'stale',
      ).length;
      const timeline = feeds.medicalIot?.snapshot?.connectivityTimeline || [];
      const latest = timeline[timeline.length - 1];
      return [
        metric('Connected devices', online || latest?.online || devices.length),
        metric('Stale signals', stale || latest?.offline),
        metric('Active alerts', feeds.medicalIot?.snapshot?.alerts?.length ?? 0),
      ];
    }
    case 'fleet': {
      const summary = feeds.fleet?.summary || {};
      return [
        metric('Available vehicles', summary.availableVehicles),
        metric('Maintenance watch', summary.maintenanceCount),
        metric('Fleet alerts', feeds.fleet?.alerts?.length ?? 0),
      ];
    }
    case 'system-health': {
      const healthSummary = feeds.platformHealth?.saas?.data?.summary || {};
      return [
        metric('Healthy probes', healthSummary.healthy),
        metric('Total probes', healthSummary.total),
        metric('Warnings', healthSummary.warning),
      ];
    }
    case 'notifications': {
      const alerts = feeds.clinicalAlerts?.ok ? feeds.clinicalAlerts.data?.alerts || [] : [];
      const unread = alerts.filter((alert) => alert.status === 'unacknowledged').length;
      const critical = alerts.filter((alert) => alert.status === 'unacknowledged').length;
      return [
        metric('Unread alerts', unread || alerts.length),
        metric('Open signals', alerts.length),
        metric('Critical queue', critical),
      ];
    }
    default:
      return null;
  }
}

export function applyLiveMetricsToSurfaces<
  T extends {
    id: string;
    metrics: OperationsSurfaceMetric[];
    status?: string;
  },
>(surfaces: readonly T[], feeds: OperationsLiveFeeds = {}): T[] {
  return surfaces.map((surface) => {
    const liveMetrics = buildLiveSurfaceMetrics(surface.id, feeds);
    if (!liveMetrics) return surface;
    return {
      ...surface,
      metrics: liveMetrics,
      status: `${surface.status || 'configured'} · live scan`,
    };
  });
}