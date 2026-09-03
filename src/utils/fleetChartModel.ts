export type FleetChartDatum = Readonly<{ name: string; value: number; color?: string }>;

export function buildFleetStatusChart(
  statusDistribution: readonly { name: string; value: number }[] = [],
): FleetChartDatum[] {
  return statusDistribution
    .map((entry) => ({
      name: entry.name,
      value: Number(entry.value) || 0,
    }))
    .filter((row) => row.value > 0);
}

export function buildFleetUtilizationChart(
  dispatchLoadTrend: readonly { label: string; value: number }[] = [],
): FleetChartDatum[] {
  return dispatchLoadTrend
    .map((entry) => ({
      name: entry.label,
      value: Number(entry.value) || 0,
    }))
    .filter((row) => row.value > 0)
    .slice(0, 8);
}

export function buildFleetMaintenanceChart(
  maintenanceRisk: readonly { name: string; value: number }[] = [],
): FleetChartDatum[] {
  return maintenanceRisk
    .map((entry) => ({
      name: entry.name,
      value: Number(entry.value) || 0,
    }))
    .filter((row) => row.value > 0)
    .slice(0, 8);
}

export function buildFleetEtaChart(
  etaTrend: readonly { label: string; value: number }[] = [],
): FleetChartDatum[] {
  return etaTrend
    .map((entry) => ({
      name: entry.label,
      value: Number(entry.value) || 0,
    }))
    .filter((row) => row.value > 0)
    .slice(0, 8);
}
