export type DispatchQueueRow = Readonly<{
  id: string;
  label: string;
  priorityScore: number;
  reason: string;
  status: string;
}>;

export type DispatchChartDatum = Readonly<{ name: string; value: number }>;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildDispatchPriorityQueue(
  vehicles: readonly {
    id: string;
    label: string;
    status: string;
    utilizationPercent?: number;
    energyPercent?: number;
    maintenanceStatus?: string;
    etaMinutes?: number | null;
    freshness?: string;
  }[] = [],
  alerts: readonly { vehicleId: string; severity: string; title: string }[] = [],
): DispatchQueueRow[] {
  const alertsByVehicle = alerts.reduce<Record<string, number>>((acc, alert) => {
    const weight = alert.severity === 'critical' || alert.severity === 'high' ? 20 : 10;
    acc[alert.vehicleId] = (acc[alert.vehicleId] || 0) + weight;
    return acc;
  }, {});

  return vehicles
    .map((vehicle) => {
      let score = vehicle.utilizationPercent ?? 0;
      if (vehicle.energyPercent != null && vehicle.energyPercent < 35) score += 18;
      if (vehicle.maintenanceStatus && vehicle.maintenanceStatus !== 'ok') score += 16;
      if (vehicle.freshness === 'stale') score += 12;
      if (vehicle.freshness === 'offline') score += 24;
      if (vehicle.status === 'maintenance') score += 20;
      score += alertsByVehicle[vehicle.id] || 0;

      const reasons = [];
      if ((alertsByVehicle[vehicle.id] || 0) > 0) reasons.push('active alert');
      if (vehicle.energyPercent != null && vehicle.energyPercent < 35) reasons.push('low energy');
      if (vehicle.maintenanceStatus && vehicle.maintenanceStatus !== 'ok') reasons.push('maintenance review');
      if (vehicle.freshness === 'offline' || vehicle.freshness === 'stale') reasons.push(`${vehicle.freshness} GPS`);
      if ((vehicle.utilizationPercent ?? 0) >= 85) reasons.push('high utilization');

      return {
        id: vehicle.id,
        label: vehicle.label,
        priorityScore: clampScore(score),
        reason: reasons.length ? reasons.join(', ') : 'routine monitoring',
        status: vehicle.status,
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 8);
}

export function buildDispatchLoadChart(
  queue: readonly DispatchQueueRow[] = [],
): DispatchChartDatum[] {
  return queue.map((row) => ({
    name: row.id,
    value: row.priorityScore,
  }));
}