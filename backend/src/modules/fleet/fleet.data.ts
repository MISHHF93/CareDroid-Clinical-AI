import { FleetAlert, FleetRoute, FleetSummary, FleetVehicle } from './fleet.types';

export const FLEET_SOURCE = Object.freeze({
  demo: true,
  source: 'demo-fleet-live-tracking',
  sourceLabel:
    'Backend demo fleet live tracking - replace with real vehicle GPS feeds before operational use',
  generatedBy: 'backend-fleet-demo-service',
});

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export function buildFleetVehicles(): FleetVehicle[] {
  return [
    {
      id: 'VH-101',
      label: 'Van 101 - North route',
      status: 'occupied',
      freshness: 'fresh',
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
      lastSeenAt: isoMinutesAgo(2),
      locationSource: 'Backend demo GPS coordinate',
    },
    {
      id: 'VH-204',
      label: 'Truck 204 - Depot',
      status: 'available',
      freshness: 'fresh',
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
      lastSeenAt: isoMinutesAgo(4),
      locationSource: 'Backend demo depot coordinate',
    },
    {
      id: 'VH-118',
      label: 'Van 118 - South loop',
      status: 'active',
      freshness: 'fresh',
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
      lastSeenAt: isoMinutesAgo(7),
      locationSource: 'Backend demo GPS coordinate',
    },
    {
      id: 'VH-077',
      label: 'Truck 077 - Workshop',
      status: 'maintenance',
      freshness: 'offline',
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
      lastSeenAt: isoMinutesAgo(92),
      locationSource: 'Backend demo maintenance yard coordinate',
    },
    {
      id: 'VH-312',
      label: 'Van 312 - City center',
      status: 'occupied',
      freshness: 'stale',
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
      lastSeenAt: isoMinutesAgo(16),
      locationSource: 'Backend demo GPS coordinate',
    },
  ];
}

export function buildFleetRoutes(): FleetRoute[] {
  return [
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
}

export function buildFleetAlerts(vehicles = buildFleetVehicles()): FleetAlert[] {
  return vehicles.flatMap((vehicle) => {
    const alerts: FleetAlert[] = [];
    if (vehicle.freshness === 'offline' || vehicle.freshness === 'stale') {
      alerts.push({
        id: `${vehicle.id}-location-${vehicle.freshness}`,
        vehicleId: vehicle.id,
        severity: vehicle.freshness === 'offline' ? 'high' : 'medium',
        title: vehicle.freshness === 'offline' ? 'Offline or stale GPS' : 'Stale GPS coordinate',
        detail: `${vehicle.label} has a ${vehicle.freshness} GPS coordinate.`,
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

export function buildFleetSummary(
  vehicles = buildFleetVehicles(),
  routes = buildFleetRoutes(),
  alerts = buildFleetAlerts(vehicles),
): FleetSummary {
  const utilizationValues = vehicles.map((vehicle) => vehicle.utilizationPercent);
  const etaValues = vehicles
    .map((vehicle) => vehicle.etaMinutes)
    .filter((eta): eta is number => Number.isFinite(eta));

  return {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter((vehicle) => ['active', 'occupied'].includes(vehicle.status))
      .length,
    availableVehicles: vehicles.filter((vehicle) => vehicle.status === 'available').length,
    staleVehicles: vehicles.filter((vehicle) => vehicle.freshness === 'stale').length,
    offlineVehicles: vehicles.filter((vehicle) => vehicle.freshness === 'offline').length,
    activeRoutes: routes.filter((route) => route.status === 'active').length,
    delayedRoutes: routes.filter((route) => route.status === 'delayed').length,
    activeAlerts: alerts.length,
    averageUtilizationPercent: utilizationValues.length
      ? Math.round(
          utilizationValues.reduce((sum, value) => sum + value, 0) / utilizationValues.length,
        )
      : 0,
    averageEtaMinutes: etaValues.length
      ? Math.round(etaValues.reduce((sum, value) => sum + value, 0) / etaValues.length)
      : null,
    updatedAt: new Date().toISOString(),
    source: 'backend-demo-fleet-live-tracking',
  };
}
