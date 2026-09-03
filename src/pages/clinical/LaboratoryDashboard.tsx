import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildLabStatusChart,
  buildSpecimenQueueChart,
  DEMO_LAB_RESULTS,
  labStatusTone,
} from '../../utils/laboratoryChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './LaboratoryDashboard.css';

export default function LaboratoryDashboard() {
  useRouteChromeRegistration({ title: 'Laboratory' });
  const results = DEMO_LAB_RESULTS;
  const statusChart = useMemo(() => buildLabStatusChart(results), [results]);
  const queueChart = useMemo(() => buildSpecimenQueueChart(results), [results]);

  const criticalCount = results.filter((row) => row.status === 'critical').length;
  const abnormalCount = results.filter((row) => row.status === 'abnormal').length;
  const pendingCount = results.filter((row) => row.status === 'pending').length;

  return (
    <main className="laboratory-page" aria-label="Laboratory dashboard">
      <header className="laboratory-page__header">
        <div className="laboratory-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <p className="laboratory-page-title-text" data-testid="cd-page-title-text">
              Laboratory
            </p>
            <p>Demo specimen queue, abnormal result triage, and reference-range trend cards.</p>
          </div>
        </div>
        <div className="laboratory-page__actions">
          <Link to="/tools/lab-interpreter">Lab interpreter</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
          <Link to={CANONICAL_ROUTES.simulation}>Simulation suite</Link>
          <Link to={CANONICAL_ROUTES.simulationOutcomes}>Outcomes</Link>
          <Link to={CANONICAL_ROUTES.medical3dViewer}>3D viewer</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Laboratory source state"
        states={[
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.SIMULATED,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
        ]}
        details="Demo lab results and specimen queue. Use Lab Interpreter for governed clinical decision support."
      />

      <div
        className="laboratory-page__metrics"
        role="group"
        aria-label="Laboratory summary metrics"
      >
        <MetricCard
          label="Critical values"
          value={String(criticalCount)}
          hint="Requires immediate notification"
          tone={criticalCount > 0 ? 'critical' : 'good'}
        />
        <MetricCard
          label="Abnormal"
          value={String(abnormalCount)}
          hint="Outside reference range"
          tone={abnormalCount > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Pending"
          value={String(pendingCount)}
          hint="Awaiting verification"
          tone="neutral"
        />
        <MetricCard
          label="Specimens"
          value={String(results.length)}
          hint="In current demo queue"
          tone="neutral"
        />
      </div>

      <div className="laboratory-page__charts">
        <VisualizationPanel
          title="Result status mix"
          description="Distribution of demo lab results by verification status."
          badge="Queue"
        >
          <CategoryBarChart
            data={statusChart}
            title="Result status mix"
            color="var(--app-chart-1)"
            emptyMessage="Status chart appears when results are queued."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Specimen priority"
          description="Critical, abnormal, pending, and normal specimens in the demo queue."
          badge="Triage"
        >
          <CategoryBarChart
            data={queueChart}
            title="Specimen priority"
            color="var(--app-chart-4)"
            emptyMessage="Priority chart appears when specimens are registered."
          />
        </VisualizationPanel>
      </div>

      <section className="laboratory-page__panel" aria-label="Recent lab results">
        <h2>Recent results</h2>
        <p>Demo records for training and workflow orientation — not connected to a live LIS.</p>
        <div className="laboratory-page__table" role="table" aria-label="Recent lab results table">
          <div className="laboratory-page__table-head" role="row">
            <span role="columnheader">Test</span>
            <span role="columnheader">Value</span>
            <span role="columnheader">Patient</span>
            <span role="columnheader">Collected</span>
            <span role="columnheader">Status</span>
          </div>
          {results.map((row) => (
            <div key={row.id} className="laboratory-page__table-row" role="row">
              <span role="cell">{row.test}</span>
              <span role="cell">
                {row.value}
                {row.unit ? ` ${row.unit}` : ''}
              </span>
              <span role="cell">{row.patient}</span>
              <span role="cell">{row.collectedAt}</span>
              <span
                role="cell"
                className={`laboratory-page__status laboratory-page__status--${labStatusTone(row.status)}`}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
