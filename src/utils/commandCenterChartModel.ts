import type { HospitalCommandMetric } from '../services/hospitalCommandCenterModel';
import type { CommandCenterHourlyArrival } from '../components/whiteboard/commandCenterThroughputModel';

export type ChartDatum = Readonly<{ name: string; value: number }>;

function parseMetricValue(value: string | number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildHourlyArrivalsChart(
  hourlyArrivals: readonly CommandCenterHourlyArrival[],
): ChartDatum[] {
  return hourlyArrivals.map((entry) => ({
    name: entry.hour.length > 5 ? entry.hour.slice(0, 5) : entry.hour,
    value: entry.count,
  }));
}

export function buildMetricSignalChart(metrics: readonly HospitalCommandMetric[]): ChartDatum[] {
  return metrics
    .map((metric) => ({
      name: metric.label.length > 16 ? `${metric.label.slice(0, 16)}…` : metric.label,
      value: Math.max(0, parseMetricValue(metric.value)),
    }))
    .filter((row) => row.value > 0)
    .slice(0, 8);
}

export function buildComplianceChart(input: {
  breaches: number;
  activeTraces: number;
}): ChartDatum[] {
  const compliant = Math.max(0, input.activeTraces - input.breaches);
  return [
    { name: 'Compliant', value: compliant },
    { name: 'Breaches', value: input.breaches },
  ].filter((row) => row.value > 0);
}
