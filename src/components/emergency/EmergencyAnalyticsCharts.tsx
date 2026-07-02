import { useMemo } from 'react';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';
import {
  CategoryBarChart,
  DistributionDonutChart,
  TrendChart,
  VisualizationPanel,
} from '../dashboard/DashboardVisualizations';
import {
  buildComplaintsChart,
  buildDailyVolumeChart,
  buildHourlyArrivalsChart,
  buildWaitTrendChart,
} from '../../utils/emergencyAnalyticsChartModel';
import './EmergencyAnalyticsCharts.css';

type EmergencyAnalyticsChartsProps = {
  dailyVolume: readonly { date: string; count: number }[];
  hourlyArrivals: readonly { hour: string; count: number }[];
  waitTrend: readonly { date: string; avgWaitMinutes: number }[];
  topComplaints: readonly { name: string; count: number }[];
  showSecondaryCharts?: boolean;
};

export default function EmergencyAnalyticsCharts({
  dailyVolume,
  hourlyArrivals,
  waitTrend,
  topComplaints,
  showSecondaryCharts = true,
}: EmergencyAnalyticsChartsProps) {
  const volumeChart = useMemo(() => buildDailyVolumeChart(dailyVolume), [dailyVolume]);
  const arrivalsChart = useMemo(() => buildHourlyArrivalsChart(hourlyArrivals), [hourlyArrivals]);
  const waitChart = useMemo(() => buildWaitTrendChart(waitTrend), [waitTrend]);
  const complaintsChart = useMemo(() => buildComplaintsChart(topComplaints), [topComplaints]);

  return (
    <section className="emergency-analytics-charts" aria-label="Department analytics charts">
      <div className="emergency-analytics-charts__intro">
        <GraphicIconBadge iconKey="chart-bar" accent="brand" size="md" />
        <div>
          <h3>Throughput visuals</h3>
          <p>Charted volume, arrivals, wait trends, and complaint mix for shift review.</p>
        </div>
      </div>

      <div className="dashboard-visual-grid emergency-analytics-charts__grid">
        <VisualizationPanel
          title="Daily Patient Volume"
          description="Last 7 days of department arrivals."
          badge="Volume"
        >
          <CategoryBarChart
            data={volumeChart}
            title="Daily Patient Volume"
            xKey="name"
            color="var(--app-chart-1)"
            emptyMessage="No daily patient volume returned."
          />
        </VisualizationPanel>

        {showSecondaryCharts ? (
          <>
            <VisualizationPanel
              title="Hourly Arrival Heatmap"
              description="Today's hourly arrival distribution."
              badge="Arrivals"
            >
              <CategoryBarChart
                data={arrivalsChart}
                title="Hourly Arrival Heatmap"
                xKey="name"
                color="var(--app-chart-2)"
                emptyMessage="No hourly arrival data returned."
              />
            </VisualizationPanel>

            <VisualizationPanel
              title="Average Wait Time Trend"
              description="Seven-day average wait minutes."
              badge="Wait"
            >
              <TrendChart
                data={waitChart}
                title="Average Wait Time Trend"
                xKey="name"
                dataKey="value"
                color="var(--app-chart-4)"
                emptyMessage="No wait time trend returned."
              />
            </VisualizationPanel>

            <VisualizationPanel
              title="Top Chief Complaints"
              description="Top complaint mix for the active board."
              badge="Mix"
            >
              <DistributionDonutChart
                data={complaintsChart}
                title="Top Chief Complaints"
                emptyMessage="No complaint mix returned."
              />
            </VisualizationPanel>
          </>
        ) : null}
      </div>
    </section>
  );
}