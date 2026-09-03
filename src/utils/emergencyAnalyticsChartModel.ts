export type AnalyticsChartDatum = Readonly<{ name: string; value: number; color?: string }>;

export function buildDailyVolumeChart(
  dailyVolume: readonly { date: string; count: number }[],
): AnalyticsChartDatum[] {
  return dailyVolume.map((point) => ({
    name: point.date,
    value: Number(point.count) || 0,
  }));
}

export function buildHourlyArrivalsChart(
  hourlyArrivals: readonly { hour: string; count: number }[],
): AnalyticsChartDatum[] {
  return hourlyArrivals.map((entry) => ({
    name: entry.hour.length > 5 ? entry.hour.slice(0, 5) : entry.hour,
    value: Number(entry.count) || 0,
  }));
}

export function buildWaitTrendChart(
  waitTrend: readonly { date: string; avgWaitMinutes: number }[],
): AnalyticsChartDatum[] {
  return waitTrend.map((point) => ({
    name: point.date,
    value: Number(point.avgWaitMinutes) || 0,
  }));
}

export function buildComplaintsChart(
  topComplaints: readonly { name: string; count: number }[],
): AnalyticsChartDatum[] {
  return topComplaints.map((complaint) => ({
    name: complaint.name,
    value: Number(complaint.count) || 0,
  }));
}
