/**
 * Mock fleet telemetry for Fleet Command Dashboard (replace with REST when backend ships).
 */

const MOCK_VEHICLES = [
  {
    id: 'VH-101',
    label: 'Van 101 — North route',
    status: 'occupied',
    maintenanceStatus: 'ok',
    etaMinutes: 18,
    energyType: 'electric',
    energyPercent: 72,
    utilizationPercent: 88,
    driver: 'A. Rivera',
  },
  {
    id: 'VH-204',
    label: 'Truck 204 — Depot',
    status: 'available',
    maintenanceStatus: 'ok',
    etaMinutes: null,
    energyType: 'diesel',
    energyPercent: 91,
    utilizationPercent: 42,
    driver: null,
  },
  {
    id: 'VH-118',
    label: 'Van 118 — South loop',
    status: 'active',
    maintenanceStatus: 'ok',
    etaMinutes: 34,
    energyType: 'electric',
    energyPercent: 54,
    utilizationPercent: 76,
    driver: 'J. Kim',
  },
  {
    id: 'VH-077',
    label: 'Truck 077 — Workshop',
    status: 'maintenance',
    maintenanceStatus: 'scheduled_service',
    etaMinutes: null,
    energyType: 'diesel',
    energyPercent: 38,
    utilizationPercent: 0,
    driver: null,
  },
  {
    id: 'VH-312',
    label: 'Van 312 — City center',
    status: 'occupied',
    maintenanceStatus: 'warning',
    etaMinutes: 9,
    energyType: 'electric',
    energyPercent: 31,
    utilizationPercent: 92,
    driver: 'M. Okafor',
  },
  {
    id: 'VH-189',
    label: 'Truck 189 — Yard',
    status: 'available',
    maintenanceStatus: 'ok',
    etaMinutes: null,
    energyType: 'diesel',
    energyPercent: 67,
    utilizationPercent: 35,
    driver: null,
  },
];

function computeSummary(vehicles) {
  const active = vehicles.filter((v) => v.status === 'active').length;
  const available = vehicles.filter((v) => v.status === 'available').length;
  const occupied = vehicles.filter((v) => v.status === 'occupied').length;
  const inMaintenance = vehicles.filter(
    (v) => v.status === 'maintenance' || v.maintenanceStatus !== 'ok'
  ).length;
  const utilizationValues = vehicles.map((v) => v.utilizationPercent).filter(Number.isFinite);
  const etaValues = vehicles
    .map((v) => v.etaMinutes)
    .filter((n) => Number.isFinite(n) && n >= 0);

  const averageUtilizationPercent =
    utilizationValues.length > 0
      ? Math.round(utilizationValues.reduce((a, b) => a + b, 0) / utilizationValues.length)
      : 0;

  const averageEtaMinutes =
    etaValues.length > 0 ? Math.round(etaValues.reduce((a, b) => a + b, 0) / etaValues.length) : null;

  return {
    activeVehicles: active,
    availableVehicles: available,
    occupiedVehicles: occupied,
    maintenanceCount: inMaintenance,
    totalVehicles: vehicles.length,
    averageUtilizationPercent,
    averageEtaMinutes,
    lowEnergyCount: vehicles.filter((v) => v.energyPercent < 35).length,
    updatedAt: new Date().toISOString(),
    source: 'mock-telemetry',
  };
}

function buildFleetVisualizationData(vehicles) {
  const statusDistribution = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
    return acc;
  }, {});
  const maintenanceRisk = vehicles.map((vehicle) => ({
    name: vehicle.id,
    value:
      vehicle.status === 'maintenance'
        ? 100
        : vehicle.maintenanceStatus === 'warning'
          ? 72
          : Math.max(10, 100 - vehicle.energyPercent),
  }));
  const etaTrend = vehicles
    .filter((vehicle) => Number.isFinite(vehicle.etaMinutes))
    .map((vehicle) => ({ label: vehicle.id, value: vehicle.etaMinutes }));
  const dispatchLoadTrend = vehicles.map((vehicle) => ({
    label: vehicle.id,
    value: vehicle.utilizationPercent,
  }));

  return {
    statusDistribution: Object.entries(statusDistribution).map(([name, value]) => ({ name, value })),
    maintenanceRisk,
    etaTrend,
    dispatchLoadTrend,
    routeEfficiency: vehicles.length
      ? Math.round(
          vehicles.reduce((sum, vehicle) => sum + Math.max(0, 100 - (vehicle.etaMinutes || 0)), 0) /
            vehicles.length
        )
      : 0,
  };
}

/**
 * @param {{ signal?: AbortSignal, delayMs?: number, emptyFleet?: boolean }} [options]
 * @returns {Promise<{ summary: object, vehicles: object[] }>}
 */
export async function fetchFleetCommandSnapshot(options = {}) {
  const { signal, delayMs = 420, emptyFleet = false } = options;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true }
      );
    }
  });

  const vehicles = emptyFleet ? [] : MOCK_VEHICLES.map((v) => ({ ...v }));
  return {
    summary: computeSummary(vehicles),
    vehicles,
    visualizations: buildFleetVisualizationData(vehicles),
  };
}

export const FLEET_VEHICLE_STATUS_LABELS = {
  active: 'Active (on shift)',
  available: 'Available',
  occupied: 'On job',
  maintenance: 'In maintenance',
};

export const FLEET_MAINTENANCE_LABELS = {
  ok: 'No issues',
  warning: 'Monitor',
  scheduled_service: 'Scheduled service',
};
