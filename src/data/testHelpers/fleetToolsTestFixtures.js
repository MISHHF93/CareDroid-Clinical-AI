/**
 * Deterministic fixtures for PR-FLEET comprehensive tests.
 */

export const FLEET_RISK_BAND_BOUNDARIES = Object.freeze([
  { score: 0, band: 'low' },
  { score: 24, band: 'low' },
  { score: 25, band: 'moderate' },
  { score: 49, band: 'moderate' },
  { score: 50, band: 'high' },
  { score: 74, band: 'high' },
  { score: 75, band: 'critical' },
  { score: 100, band: 'critical' },
]);

/** Minimal input that passes hasMinimumScoringInput */
export const FLEET_PM_MINIMAL_INPUT = Object.freeze({
  vehicleAgeYears: 5,
  mileage: 45_000,
});

/** Deterministic high-risk maintenance profile */
export const FLEET_PM_HIGH_RISK_INPUT = Object.freeze({
  vehicleAgeYears: 22,
  mileage: 210_000,
  monthsSinceLastService: 20,
  servicesLast12Months: 0,
  diagnosticCodes: 'P0301, P0420',
  batteryHealthPercent: 35,
  telemetry: {
    engineTempSpikes: 10,
    harshBrakingEvents: 30,
    idleHoursPerWeek: 40,
    faultCodesLast30Days: 8,
  },
});

/** Four-stop route with mixed priorities for ordering assertions */
export const FLEET_ROUTE_PRIORITY_INPUT = Object.freeze({
  depotLabel: 'Hub A',
  destinations: [
    { id: 'c', label: 'Clinic C', priority: 'low', windowStart: '14:00' },
    { id: 'a', label: 'Clinic A', priority: 'urgent', windowStart: '10:00' },
    { id: 'b', label: 'Clinic B', priority: 'high', windowStart: '09:00' },
    { id: 'd', label: 'Clinic D', priority: 'high', windowStart: '11:00' },
  ],
  trafficConstraints: { level: 'low' },
});

export const FLEET_ROUTE_DISTANCE_TIE_INPUT = Object.freeze({
  destinations: [
    { id: '1', label: 'Far', priority: 'medium', distanceKm: 20 },
    { id: '2', label: 'Near', priority: 'medium', distanceKm: 3 },
  ],
});

/** Fixed mock snapshot shape for dashboard UI tests */
export function buildFleetDashboardSnapshot(overrides = {}) {
  const vehicles = overrides.vehicles ?? [
    {
      id: 'VH-TEST',
      label: 'Test Van',
      status: 'available',
      maintenanceStatus: 'ok',
      etaMinutes: null,
      energyType: 'electric',
      energyPercent: 80,
      utilizationPercent: 40,
      driver: null,
    },
  ];
  const summary = {
    activeVehicles: 1,
    availableVehicles: 2,
    occupiedVehicles: 2,
    maintenanceCount: 1,
    totalVehicles: vehicles.length,
    averageUtilizationPercent: 55,
    averageEtaMinutes: 20,
    lowEnergyCount: 0,
    updatedAt: '2026-05-16T12:00:00.000Z',
    source: 'mock-telemetry',
    ...overrides.summary,
  };
  return { summary, vehicles };
}

export const FLEET_DISPATCH_LAUNCH_PHRASES = Object.freeze([
  'help with dispatch intelligence for vehicle assignment',
  'fleet dispatch bottleneck review',
  'dispatch assistant prioritize requests',
]);

export const FLEET_REGISTRY_NLU_PHRASES = Object.freeze([
  ['fleet command', 'fleet-command'],
  ['predictive maintenance', 'predictive-maintenance'],
  ['route optimizer', 'route-optimizer'],
  ['fleet dispatch', 'dispatch-ai'],
]);
