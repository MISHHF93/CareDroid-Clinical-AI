import { fetchLiveTrackingCapability } from './liveTrackingApi';

/**
 * Mock fleet telemetry for Fleet Command Dashboard and Live Map.
 * Replace with REST endpoints when backend live tracking ships.
 */

export const FLEET_LIVE_TRACKING_BACKEND_STATUS = Object.freeze({
  implemented: true,
  demoContractOnly: true,
  plannedEndpoints: Object.freeze([
    '/api/fleet/vehicles/live',
    '/api/fleet/routes/active',
    '/api/fleet/dispatch/events',
    '/api/fleet/alerts',
  ]),
  plannedModules: Object.freeze([
    'fleet-live-tracking',
    'vehicle-location-service',
    'route-status-service',
    'dispatch-events',
    'fleet-alerting',
  ]),
});

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
    coordinates: { latitude: 40.7558, longitude: -73.9864 },
    mapPosition: { x: 38, y: 28 },
    heading: 74,
    speedMph: 22,
    routeId: 'route-north',
    destination: 'CareDroid North Clinic',
    lastSeenAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    locationSource: 'Demo GPS coordinate',
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
    coordinates: { latitude: 40.7411, longitude: -73.9903 },
    mapPosition: { x: 52, y: 58 },
    heading: 0,
    speedMph: 0,
    routeId: null,
    destination: 'Depot',
    lastSeenAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    locationSource: 'Demo depot coordinate',
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
    coordinates: { latitude: 40.7306, longitude: -73.9972 },
    mapPosition: { x: 35, y: 72 },
    heading: 142,
    speedMph: 18,
    routeId: 'route-south',
    destination: 'Home health stop S-4',
    lastSeenAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    locationSource: 'Demo GPS coordinate',
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
    coordinates: { latitude: 40.7444, longitude: -74.0059 },
    mapPosition: { x: 18, y: 54 },
    heading: 0,
    speedMph: 0,
    routeId: null,
    destination: 'Workshop',
    lastSeenAt: new Date(Date.now() - 92 * 60 * 1000).toISOString(),
    locationSource: 'Demo maintenance yard coordinate',
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
    coordinates: { latitude: 40.7484, longitude: -73.9857 },
    mapPosition: { x: 68, y: 42 },
    heading: 251,
    speedMph: 13,
    routeId: 'route-center',
    destination: 'Hospital courier bay',
    lastSeenAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    locationSource: 'Demo GPS coordinate',
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
    coordinates: { latitude: 40.7369, longitude: -73.9824 },
    mapPosition: { x: 78, y: 74 },
    heading: 0,
    speedMph: 0,
    routeId: null,
    destination: 'Yard',
    lastSeenAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
    locationSource: 'Demo yard coordinate',
  },
];

const MOCK_ACTIVE_ROUTES = [
  {
    id: 'route-north',
    name: 'North clinic route',
    vehicleId: 'VH-101',
    status: 'active',
    etaMinutes: 18,
    stopsRemaining: 2,
    path: [
      { x: 24, y: 40 },
      { x: 38, y: 28 },
      { x: 58, y: 22 },
      { x: 74, y: 18 },
    ],
  },
  {
    id: 'route-south',
    name: 'South home-health loop',
    vehicleId: 'VH-118',
    status: 'active',
    etaMinutes: 34,
    stopsRemaining: 4,
    path: [
      { x: 20, y: 62 },
      { x: 35, y: 72 },
      { x: 52, y: 80 },
      { x: 70, y: 78 },
    ],
  },
  {
    id: 'route-center',
    name: 'City center courier',
    vehicleId: 'VH-312',
    status: 'delayed',
    etaMinutes: 9,
    stopsRemaining: 1,
    path: [
      { x: 52, y: 58 },
      { x: 62, y: 48 },
      { x: 68, y: 42 },
      { x: 82, y: 36 },
    ],
  },
];

function minutesSince(value) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function vehicleFreshness(vehicle) {
  const minutes = minutesSince(vehicle.lastSeenAt);
  if (vehicle.status === 'maintenance') return 'offline';
  if (minutes == null) return 'unknown';
  if (minutes > 45) return 'offline';
  if (minutes > 15) return 'stale';
  return 'fresh';
}

function buildFleetLiveAlerts(vehicles) {
  return vehicles.flatMap((vehicle) => {
    const alerts = [] as any[];
    const freshness = vehicleFreshness(vehicle);
    if (freshness === 'offline' || freshness === 'stale') {
      alerts.push({
        id: `${vehicle.id}-location-${freshness}`,
        vehicleId: vehicle.id,
        severity: freshness === 'offline' ? 'high' : 'medium',
        title: freshness === 'offline' ? 'Offline or stale GPS' : 'Stale GPS coordinate',
        detail: `${vehicle.label} last reported ${minutesSince(vehicle.lastSeenAt) ?? 'unknown'} minutes ago.`,
        triggeredAt: vehicle.lastSeenAt,
      });
    }
    if (vehicle.energyPercent < 35) {
      alerts.push({
        id: `${vehicle.id}-low-energy`,
        vehicleId: vehicle.id,
        severity: 'medium',
        title: 'Low energy',
        detail: `${vehicle.label} is below the configured 35% energy review threshold.`,
        triggeredAt: vehicle.lastSeenAt,
      });
    }
    if (vehicle.maintenanceStatus !== 'ok') {
      alerts.push({
        id: `${vehicle.id}-maintenance`,
        vehicleId: vehicle.id,
        severity: vehicle.status === 'maintenance' ? 'high' : 'medium',
        title: 'Maintenance review',
        detail: `${vehicle.label} requires maintenance review before dispatch assignment.`,
        triggeredAt: vehicle.lastSeenAt,
      });
    }
    return alerts;
  });
}

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
export async function fetchFleetCommandSnapshot(options: any = {}) {
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

function buildFleetLiveSummary(vehicles, routes, alerts) {
  return {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter((vehicle) => ['active', 'occupied'].includes(vehicle.status)).length,
    availableVehicles: vehicles.filter((vehicle) => vehicle.status === 'available').length,
    staleVehicles: vehicles.filter((vehicle) => vehicle.freshness === 'stale').length,
    offlineVehicles: vehicles.filter((vehicle) => vehicle.freshness === 'offline').length,
    activeRoutes: routes.filter((route) => route.status === 'active').length,
    delayedRoutes: routes.filter((route) => route.status === 'delayed').length,
    activeAlerts: alerts.length,
    averageUtilizationPercent: vehicles.length
      ? Math.round(
          vehicles.reduce((sum, vehicle) => sum + (vehicle.utilizationPercent || 0), 0) /
            vehicles.length
        )
      : 0,
    averageEtaMinutes: vehicles.some((vehicle) => Number.isFinite(vehicle.etaMinutes))
      ? Math.round(
          vehicles
            .filter((vehicle) => Number.isFinite(vehicle.etaMinutes))
            .reduce((sum, vehicle) => sum + vehicle.etaMinutes, 0) /
            vehicles.filter((vehicle) => Number.isFinite(vehicle.etaMinutes)).length
        )
      : null,
    updatedAt: new Date().toISOString(),
    source: 'demo-fleet-live-tracking',
  };
}

async function fetchFleetLiveTrackingFromApi(signal) {
  const [vehiclesResult, routesResult, alertsResult] = await Promise.all([
    fetchLiveTrackingCapability('fleetLiveTracking', '/api/fleet/vehicles/live', { signal }),
    fetchLiveTrackingCapability('fleetActiveRoutes', '/api/fleet/routes/active', { signal }),
    fetchLiveTrackingCapability('fleetAlerts', '/api/fleet/alerts', { signal }),
  ]);

  if (!vehiclesResult.ok || !routesResult.ok) {
    return null;
  }

  const vehicles = (vehiclesResult.payload?.vehicles || []).map((vehicle) => ({
    ...vehicle,
    freshness: vehicle.freshness || vehicleFreshness(vehicle),
  }));
  const routes = routesResult.payload?.routes || [];
  const alerts = alertsResult.ok ? alertsResult.payload?.alerts || [] : buildFleetLiveAlerts(vehicles);
  const summary = {
    ...buildFleetLiveSummary(vehicles, routes, alerts),
    ...(vehiclesResult.payload?.summary || {}),
    activeRoutes: routes.filter((route) => route.status === 'active').length,
    delayedRoutes: routes.filter((route) => route.status === 'delayed').length,
    activeAlerts: alerts.length,
    source: 'backend-demo-fleet-live-tracking',
  };

  return {
    summary,
    vehicles,
    routes,
    alerts,
    backendStatus: FLEET_LIVE_TRACKING_BACKEND_STATUS,
    sourceLabel:
      vehiclesResult.sourceLabel ||
      'Backend demo fleet live tracking - replace with real vehicle GPS feeds before operational use',
    message:
      vehiclesResult.message ||
      'Fleet map uses backend demo coordinates only. Verify vehicle location, dispatch status, and route ETAs in the system of record.',
  };
}

/**
 * @param {{ signal?: AbortSignal, delayMs?: number, emptyFleet?: boolean }} [options]
 * @returns {Promise<{ summary: object, vehicles: object[], routes: object[], alerts: object[], backendStatus: object, sourceLabel: string }>}
 */
export async function fetchFleetLiveTrackingSnapshot(options: any = {}) {
  const { signal, delayMs = 320, emptyFleet = false } = options;

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

  if (!emptyFleet) {
    const apiSnapshot = await fetchFleetLiveTrackingFromApi(signal);
    if (apiSnapshot) return apiSnapshot;
  }

  const vehicles = emptyFleet
    ? []
    : MOCK_VEHICLES.map((vehicle) => ({
        ...vehicle,
        freshness: vehicleFreshness(vehicle),
      }));
  const routes = emptyFleet ? [] : MOCK_ACTIVE_ROUTES.map((route) => ({ ...route }));
  const alerts = buildFleetLiveAlerts(vehicles);

  return {
    summary: buildFleetLiveSummary(vehicles, routes, alerts),
    vehicles,
    routes,
    alerts,
    backendStatus: FLEET_LIVE_TRACKING_BACKEND_STATUS,
    sourceLabel:
      'Demo fleet live tracking - backend vehicle GPS and active-route endpoints are not connected',
    message:
      'Fleet map uses demo coordinates only. Verify vehicle location, dispatch status, and route ETAs in the system of record.',
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
