import {
  calculateBedOccupancy,
  calculateResourceUtilizationIndex,
} from '../utils/hospitalOperationsCalculators';
import { resolveRiskBand, scorePredictiveMaintenance } from '../services/predictiveMaintenanceScoring';

const SCORE_LABELS = Object.freeze({
  excellent: 'Excellent',
  stable: 'Stable',
  watch: 'Watch',
  degraded: 'Degraded',
  critical: 'Critical',
});

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
}

function percent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number <= 1 ? number * 100 : number;
}

function scoreBand(score, inverse = false) {
  const normalized = clamp(score);
  if (inverse) {
    if (normalized >= 75) return 'critical';
    if (normalized >= 50) return 'degraded';
    if (normalized >= 25) return 'watch';
    return 'stable';
  }
  if (normalized >= 90) return 'excellent';
  if (normalized >= 75) return 'stable';
  if (normalized >= 55) return 'watch';
  if (normalized >= 35) return 'degraded';
  return 'critical';
}

function scoreLabel(score, inverse = false) {
  return SCORE_LABELS[scoreBand(score, inverse)] || SCORE_LABELS.watch;
}

function activeAlerts(alerts) {
  return list(alerts).filter((alert) => (alert.status || 'active') === 'active');
}

function isOfflineOrStale(item) {
  return ['offline', 'stale'].includes(item?.freshness) || ['offline', 'stale'].includes(item?.status);
}

function isMaintenanceDue(item) {
  return ['due-soon', 'overdue', 'maintenance', 'scheduled_service', 'warning'].includes(
    item?.maintenanceStatus,
  );
}

function isCalibrationOverdue(item) {
  return item?.calibrationStatus === 'overdue';
}

function isLowEnergy(item) {
  const battery = Number(item?.battery ?? item?.energyPercent);
  return Number.isFinite(battery) && battery < 25;
}

function normalizeRooms(hospitalMap = {} as any, digitalTwin = {} as any) {
  const rooms = list(hospitalMap.rooms);
  if (rooms.length) {
    return rooms.map((room) => ({
      id: room.id || room.roomNumber,
      label: room.roomNumber || room.name || room.label || room.id,
      floorId: room.floorId,
      unitId: room.unitId,
      deviceCount: room.deviceCount || 0,
      activeAlertCount: room.activeAlertCount || 0,
      occupancyState: room.status || room.occupancyStatus || 'unknown',
    }));
  }
  return list(digitalTwin.rooms).map((room) => ({
    id: room.id,
    label: room.label || room.id,
    deviceCount: room.device ? 1 : 0,
    activeAlertCount: /stale|alert|high/i.test(`${room.telemetry} ${room.patientState}`) ? 1 : 0,
    occupancyState: room.patientState || 'unknown',
  }));
}

function normalizeDevices(hospitalMap = {} as any, medicalIot = {} as any) {
  return [
    ...list(hospitalMap.devices).map((device) => ({
      ...device,
      source: 'hospital-map',
      label: device.name || device.label || device.id,
      locationLabel: device.assignedRoom || device.roomId || device.location?.label,
    })),
    ...list(medicalIot.devices).map((device) => ({
      ...device,
      source: 'medical-iot',
      label: device.name || device.label || device.id,
      locationLabel: device.assignedRoom || device.location?.label,
    })),
  ];
}

function normalizeFleet(fleet = {} as any) {
  return list(fleet.vehicles).map((vehicle) => ({
    ...vehicle,
    source: 'fleet',
    label: vehicle.label || vehicle.name || vehicle.id,
    maintenanceRisk: scorePredictiveMaintenance({
      batteryHealthPercent: vehicle.energyPercent,
      monthsSinceLastService: isMaintenanceDue(vehicle) ? 13 : 4,
      diagnosticCodes: vehicle.maintenanceStatus === 'warning' ? 'P012, WARNING' : '',
      telemetry: {
        idleHoursPerWeek: vehicle.status === 'maintenance' ? 20 : 4,
        faultCodesLast30Days: vehicle.maintenanceStatus === 'warning' ? 3 : 0,
      },
    }),
  }));
}

function normalizeTelemetry(hospitalMap = {} as any, medicalIot = {} as any, fleet = {} as any) {
  const hospitalTelemetry = list(hospitalMap.devices).flatMap((device) =>
    list(device.telemetry).map((reading) => ({
      ...reading,
      id: reading.id || `${device.id}-${reading.parameter || reading.label}`,
      source: device.name || device.id,
      status: reading.status || device.freshness || device.status,
    })),
  );
  return [
    ...hospitalTelemetry,
    ...list(medicalIot.vitals).map((vital) => ({ ...vital, source: vital.source || 'medical-iot' })),
    ...list(medicalIot.trends).map((trend) => ({ ...trend, source: 'medical-iot-trend' })),
    ...list(medicalIot.connectivityTimeline).map((row) => ({ ...row, source: 'iot-connectivity' })),
    ...list(fleet.vehicles).map((vehicle) => ({
      id: `${vehicle.id}-location`,
      label: `${vehicle.label || vehicle.id} location`,
      source: 'fleet',
      status: vehicle.freshness || vehicle.status,
      value: vehicle.etaMinutes ?? vehicle.status,
    })),
  ];
}

function normalizeAlerts(hospitalMap = {} as any, medicalIot = {} as any, fleet = {} as any) {
  return [
    ...list(hospitalMap.alerts).map((alert) => ({ ...alert, sourceDomain: 'hospital-map' })),
    ...list(medicalIot.alerts).map((alert) => ({ ...alert, sourceDomain: 'medical-iot' })),
    ...list(fleet.alerts).map((alert) => ({ ...alert, sourceDomain: 'fleet' })),
  ];
}

function buildOccupancy(hospitalMap = {} as any, digitalTwin = {} as any) {
  const occupancy = digitalTwin.occupancy || {};
  const occupiedBeds =
    occupancy.occupiedBeds ??
    list(hospitalMap.beds).filter((bed) => ['occupied', 'assigned'].includes(bed.status)).length;
  const totalBeds = occupancy.totalBeds ?? hospitalMap.beds?.length ?? 0;
  const blockedBeds = list(hospitalMap.beds).filter((bed) =>
    ['blocked', 'cleaning', 'maintenance'].includes(bed.status),
  ).length;
  const calculated = calculateBedOccupancy({ occupiedBeds, totalBeds, blockedBeds });
  const floorPressure = list(digitalTwin.floors).map((floor) => ({
    id: floor.id,
    label: floor.label,
    occupancyPercent: percent(floor.occupancy),
    alerts: floor.alerts || 0,
    devices: floor.devices || 0,
    staffing: floor.staffing,
  }));
  return {
    occupiedBeds: calculated?.occupiedBeds ?? occupiedBeds,
    totalBeds: calculated?.totalBeds ?? totalBeds,
    availableBeds: calculated?.availableBeds ?? Math.max(totalBeds - occupiedBeds - blockedBeds, 0),
    blockedBeds,
    occupancyPercent: calculated?.occupancyPercent ?? percent(occupancy.occupancyPercent),
    severity: calculated?.severity || 'neutral',
    floorPressure,
  };
}

function factor(label, impact, severity = 'watch') {
  return { label, impact: clamp(impact), severity };
}

function buildFactors({ occupancy, devices, telemetry, alerts, fleetVehicles }) {
  const activeAlertCount = activeAlerts(alerts).length;
  const staleDevices = devices.filter(isOfflineOrStale);
  const lowEnergyDevices = devices.filter(isLowEnergy);
  const maintenanceDue = devices.filter((device) => isMaintenanceDue(device) || isCalibrationOverdue(device));
  const staleTelemetry = telemetry.filter((row) => ['offline', 'stale', 'abnormal', 'warning'].includes(row.status));
  const delayedFleet = fleetVehicles.filter((vehicle) =>
    ['delayed', 'maintenance'].includes(vehicle.status) || ['stale', 'offline'].includes(vehicle.freshness),
  );
  const highFleetRisk = fleetVehicles.filter(
    (vehicle) => vehicle.maintenanceRisk?.riskBand === 'high' || vehicle.maintenanceRisk?.riskBand === 'critical',
  );

  return {
    health: [
      occupancy.occupancyPercent >= 85
        ? factor(`Occupancy pressure at ${occupancy.occupancyPercent}%`, 16, 'warning')
        : factor('Occupancy in planning range', 4, 'stable'),
      staleDevices.length
        ? factor(`${staleDevices.length} stale or offline devices`, staleDevices.length * 8, 'degraded')
        : factor('Device connectivity stable', 2, 'stable'),
      activeAlertCount
        ? factor(`${activeAlertCount} active operational alerts`, activeAlertCount * 6, 'warning')
        : factor('No active operational alerts', 2, 'stable'),
      delayedFleet.length
        ? factor(`${delayedFleet.length} fleet assets delayed or unavailable`, delayedFleet.length * 7, 'warning')
        : factor('Fleet availability stable', 2, 'stable'),
    ],
    risk: [
      occupancy.occupancyPercent >= 90
        ? factor('High occupancy may reduce surge capacity', 24, 'critical')
        : factor('Occupancy risk monitored', Math.max(4, occupancy.occupancyPercent / 8), 'watch'),
      staleTelemetry.length
        ? factor(`${staleTelemetry.length} degraded telemetry signals`, staleTelemetry.length * 5, 'degraded')
        : factor('Telemetry degradation low', 3, 'stable'),
      maintenanceDue.length
        ? factor(`${maintenanceDue.length} devices need maintenance or calibration review`, maintenanceDue.length * 7, 'degraded')
        : factor('Device maintenance queue low', 3, 'stable'),
      highFleetRisk.length
        ? factor(`${highFleetRisk.length} fleet assets with elevated maintenance risk`, highFleetRisk.length * 10, 'critical')
        : factor('Fleet maintenance risk controlled', 4, 'stable'),
    ],
    readiness: [
      lowEnergyDevices.length
        ? factor(`${lowEnergyDevices.length} low battery or low energy assets`, lowEnergyDevices.length * 8, 'warning')
        : factor('Energy reserves acceptable', 2, 'stable'),
      occupancy.availableBeds <= 5
        ? factor(`${occupancy.availableBeds} beds available`, 18, 'critical')
        : factor(`${occupancy.availableBeds} beds available`, 4, 'stable'),
      activeAlertCount
        ? factor('Open alerts require review before full readiness', activeAlertCount * 4, 'warning')
        : factor('Alert queue clear', 2, 'stable'),
      maintenanceDue.length
        ? factor('Maintenance backlog blocks readiness', maintenanceDue.length * 6, 'degraded')
        : factor('Maintenance readiness acceptable', 2, 'stable'),
    ],
  };
}

function scoreFromFactors(base, factors, direction = 'subtract') {
  const impact = factors.reduce((sum, row) => sum + row.impact, 0);
  return clamp(direction === 'subtract' ? base - impact : impact);
}

function buildScore(name, value, factors, inverse = false) {
  return {
    name,
    value: clamp(value),
    band: scoreBand(value, inverse),
    label: scoreLabel(value, inverse),
    factors,
  };
}

function buildInsights({ rooms, devices, occupancy, alerts, fleetVehicles, factors }) {
  const staleDevices = devices.filter(isOfflineOrStale);
  const activeAlertRows = activeAlerts(alerts);
  const fleetRisks = fleetVehicles.filter((vehicle) =>
    ['high', 'critical'].includes(vehicle.maintenanceRisk?.riskBand),
  );
  const insights = [] as any[];

  if (occupancy.occupancyPercent >= 85) {
    insights.push({
      id: 'occupancy-pressure',
      severity: occupancy.occupancyPercent >= 95 ? 'critical' : 'warning',
      title: 'Occupancy pressure rising',
      detail: `${occupancy.occupancyPercent}% bed occupancy with ${occupancy.availableBeds} available beds.`,
      route: '/hospital-map',
    });
  }
  if (staleDevices.length) {
    insights.push({
      id: 'device-connectivity',
      severity: staleDevices.length >= 3 ? 'critical' : 'warning',
      title: 'Device telemetry degradation',
      detail: `${staleDevices.length} devices are stale or offline across Hospital Map and IoT feeds.`,
      route: '/medical-iot',
    });
  }
  if (activeAlertRows.length) {
    insights.push({
      id: 'alert-concentration',
      severity: activeAlertRows.length >= 5 ? 'critical' : 'warning',
      title: 'Alert concentration needs review',
      detail: `${activeAlertRows.length} active alerts are present across rooms, devices, and fleet.`,
      route: '/notifications',
    });
  }
  if (fleetRisks.length) {
    insights.push({
      id: 'fleet-maintenance-risk',
      severity: 'warning',
      title: 'Fleet maintenance risk detected',
      detail: `${fleetRisks.length} fleet assets have elevated maintenance risk windows.`,
      route: '/fleet/map',
    });
  }
  if (rooms.some((room) => room.activeAlertCount > 0)) {
    insights.push({
      id: 'room-watchlist',
      severity: 'watch',
      title: 'Room watchlist available',
      detail: `${rooms.filter((room) => room.activeAlertCount > 0).length} rooms have active alert context.`,
      route: '/hospital-map',
    });
  }
  if (insights.length === 0) {
    insights.push({
      id: 'stable-operations',
      severity: 'stable',
      title: 'Operations stable',
      detail: 'No major predictive blockers detected across occupancy, telemetry, alerts, or maintenance.',
      route: '/digital-twin',
    });
  }

  return insights.map((insight, index) => ({
    ...insight,
    priority: index + 1,
    relatedFactors: [...factors.health, ...factors.risk, ...factors.readiness]
      .filter((row) => row.severity !== 'stable')
      .slice(0, 3)
      .map((row) => row.label),
  }));
}

export function buildDigitalTwinIntelligence({
  digitalTwinSnapshot = {} as any,
  hospitalMapSnapshot = {} as any,
  medicalIotSnapshot = {} as any,
  fleetSnapshot = {} as any,
} = {}) {
  const hospitalMap = hospitalMapSnapshot?.snapshot || hospitalMapSnapshot || {};
  const medicalIot = medicalIotSnapshot?.snapshot || medicalIotSnapshot || {};
  const fleet = fleetSnapshot || {};
  const digitalTwin = digitalTwinSnapshot || {};

  const rooms = normalizeRooms(hospitalMap, digitalTwin);
  const devices = normalizeDevices(hospitalMap, medicalIot);
  const fleetVehicles = normalizeFleet(fleet);
  const telemetry = normalizeTelemetry(hospitalMap, medicalIot, fleet);
  const alerts = normalizeAlerts(hospitalMap, medicalIot, fleet);
  const occupancy = buildOccupancy(hospitalMap, digitalTwin);
  const maintenanceItems = [
    ...devices
      .filter((device) => isMaintenanceDue(device) || isCalibrationOverdue(device) || isLowEnergy(device))
      .map((device) => ({
        id: device.id,
        label: device.label,
        type: 'device',
        status: device.maintenanceStatus || device.calibrationStatus || device.status,
        route: '/devices',
      })),
    ...fleetVehicles
      .filter((vehicle) => isMaintenanceDue(vehicle) || ['high', 'critical'].includes(vehicle.maintenanceRisk?.riskBand))
      .map((vehicle) => ({
        id: vehicle.id,
        label: vehicle.label,
        type: 'fleet',
        status: vehicle.maintenanceStatus || vehicle.maintenanceRisk?.riskBand,
        route: '/fleet/map',
      })),
  ];
  const assets = [
    ...devices.map((device) => ({ id: device.id, label: device.label, type: 'device', route: '/devices' })),
    ...fleetVehicles.map((vehicle) => ({ id: vehicle.id, label: vehicle.label, type: 'fleet', route: '/fleet/map' })),
    ...list(digitalTwin.fleet).map((asset) => ({ id: asset.id, label: asset.label, type: 'digital-twin', route: '/digital-twin' })),
  ];
  const resourceIndex = calculateResourceUtilizationIndex({
    bedUtilizationPercent: occupancy.occupancyPercent,
    deviceUtilizationPercent: devices.length
      ? (devices.filter((device) => !isOfflineOrStale(device)).length / devices.length) * 100
      : 0,
    fleetUtilizationPercent: fleet.summary?.averageUtilizationPercent,
  });
  const factors = buildFactors({ occupancy, devices, telemetry, alerts, fleetVehicles });
  const healthScore = buildScore('Health Score', scoreFromFactors(100, factors.health), factors.health);
  const riskScore = buildScore('Risk Score', scoreFromFactors(0, factors.risk, 'add'), factors.risk, true);
  const readinessScore = buildScore('Readiness Score', scoreFromFactors(100, factors.readiness), factors.readiness);

  return {
    generatedAt: new Date().toISOString(),
    sourceLabel:
      digitalTwin.sourceLabel ||
      hospitalMap.sourceLabel ||
      medicalIot.sourceLabel ||
      fleet.sourceLabel ||
      'Digital twin intelligence assembled from operational snapshots',
    scores: {
      healthScore,
      riskScore,
      readinessScore,
    },
    domains: {
      rooms: {
        label: 'Rooms',
        count: rooms.length,
        riskCount: rooms.filter((room) => room.activeAlertCount > 0).length,
        items: rooms,
      },
      devices: {
        label: 'Devices',
        count: devices.length,
        riskCount: devices.filter((device) => isOfflineOrStale(device) || isLowEnergy(device)).length,
        items: devices,
      },
      assets: {
        label: 'Assets',
        count: assets.length,
        riskCount: maintenanceItems.length,
        items: assets,
      },
      telemetry: {
        label: 'Telemetry',
        count: telemetry.length,
        riskCount: telemetry.filter((row) => ['offline', 'stale', 'abnormal', 'warning'].includes(row.status)).length,
        items: telemetry,
      },
      alerts: {
        label: 'Alerts',
        count: alerts.length,
        riskCount: activeAlerts(alerts).length,
        items: alerts,
      },
      occupancy: {
        label: 'Occupancy',
        count: occupancy.totalBeds,
        riskCount: occupancy.occupancyPercent >= 85 ? 1 : 0,
        items: [occupancy],
      },
      maintenance: {
        label: 'Maintenance',
        count: maintenanceItems.length,
        riskCount: maintenanceItems.length,
        items: maintenanceItems,
      },
    },
    occupancy,
    resourceIndex,
    insights: buildInsights({ rooms, devices, occupancy, alerts, fleetVehicles, factors }),
    disclaimers: [
      'Operational decision support only.',
      'Validate source data before dispatch, staffing, admission, discharge, or maintenance action.',
    ],
    riskBand: resolveRiskBand(riskScore.value),
  };
}
