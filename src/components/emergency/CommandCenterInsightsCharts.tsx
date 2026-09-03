import { useMemo } from 'react';
import useUnifiedApplicationKnowledgeGraph from '../../hooks/useUnifiedApplicationKnowledgeGraph';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';
import { MetricCard, VisualizationPanel } from '../dashboard/DashboardVisualizations';
import { CategoryBarChart, DistributionDonutChart } from '../dashboard/DashboardCharts';
import type { HospitalCommandCenterSnapshot } from '../../services/hospitalCommandCenterModel';
import type { HospitalCommandMetric } from '../../services/hospitalCommandCenterModel';
import {
  buildComplianceChart,
  buildHourlyArrivalsChart,
  buildMetricSignalChart,
} from '../../utils/commandCenterChartModel';
import './CommandCenterInsightsCharts.css';

type CommandCenterInsightsChartsProps = {
  snapshot: HospitalCommandCenterSnapshot;
  visibleMetrics: readonly HospitalCommandMetric[];
};

export default function CommandCenterInsightsCharts({
  snapshot,
  visibleMetrics,
}: CommandCenterInsightsChartsProps) {
  const { analyticsSummary } = useUnifiedApplicationKnowledgeGraph();
  const arrivalsChart = useMemo(
    () => buildHourlyArrivalsChart(snapshot.throughput.hourlyArrivals || []),
    [snapshot.throughput.hourlyArrivals],
  );
  const metricChart = useMemo(() => buildMetricSignalChart(visibleMetrics), [visibleMetrics]);
  const complianceChart = useMemo(
    () => buildComplianceChart(snapshot.threeMinuteCompliance),
    [snapshot.threeMinuteCompliance],
  );

  return (
    <section className="command-center-insights" aria-label="Command center operational charts">
      <div className="command-center-insights__intro">
        <GraphicIconBadge iconKey="chart-bar" accent="brand" size="md" />
        <div>
          <h3>Throughput visuals</h3>
          <p>
            Charted arrivals, compliance, and live metric signals for faster situational awareness.
          </p>
        </div>
      </div>

      <div className="command-center-insights__metrics">
        <MetricCard
          label="Active metrics"
          value={String(visibleMetrics.length)}
          hint="Role-filtered command signals"
        />
        <MetricCard
          label="3-min breaches"
          value={String(snapshot.threeMinuteCompliance.breaches)}
          hint="Compliance pressure"
          tone={snapshot.threeMinuteCompliance.breaches > 0 ? 'critical' : 'good'}
        />
        <MetricCard
          label="Bottlenecks"
          value={String(snapshot.bottleneckCount)}
          hint="Service constraints"
          tone={snapshot.bottleneckCount > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Graph connections"
          value={String(analyticsSummary.edgeCount)}
          hint={`${analyticsSummary.nodeCount} entities linked across ED operations`}
          tone={analyticsSummary.connectedCriticalSignals > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Critical graph signals"
          value={String(analyticsSummary.connectedCriticalSignals)}
          hint="Connected alerts, events, and recommendations"
          tone={analyticsSummary.connectedCriticalSignals > 0 ? 'critical' : 'good'}
        />
      </div>

      <div className="dashboard-visual-grid command-center-insights__charts">
        <VisualizationPanel
          title="Arrivals by hour"
          description="Hourly arrival distribution from live operational analytics."
          badge="Live"
        >
          <CategoryBarChart
            data={arrivalsChart}
            title="Arrivals by hour"
            xKey="name"
            color="var(--app-chart-1)"
            emptyMessage="Hourly arrival data will appear when analytics syncs."
          />
        </VisualizationPanel>

        <VisualizationPanel
          title="Metric signals"
          description="Numeric strength of the highest-priority operational metrics."
          badge="Signals"
        >
          <CategoryBarChart
            data={metricChart}
            title="Metric signals"
            xKey="name"
            color="var(--app-chart-4)"
            emptyMessage="No numeric metric signals in the current role view."
          />
        </VisualizationPanel>

        <VisualizationPanel
          title="3-minute compliance"
          description="Compliant traces versus active breach count."
          badge="Compliance"
        >
          <DistributionDonutChart
            data={complianceChart}
            title="3-minute compliance"
            emptyMessage="No active 3-minute traces to chart."
          />
        </VisualizationPanel>
      </div>
    </section>
  );
}
