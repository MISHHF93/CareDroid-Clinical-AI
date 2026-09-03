import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildRadiologyModalityChart,
  buildRadiologyStatusChart,
  DEMO_RADIOLOGY_STUDIES,
  radiologyStatusTone,
} from '../../utils/radiologyChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './RadiologyDashboard.css';

/**
 * Third clinical department workspace (after Laboratory and Pharmacy) —
 * same "demo queue, honestly labeled" pattern as LaboratoryDashboard, since
 * unlike Pharmacy there is no pre-built real radiology tool to embed yet.
 * Links out to the real, working Medical 3D Viewer and imaging-decision
 * calculators (NEXUS/Canadian C-Spine) rather than fabricating a reads UI.
 */
export default function RadiologyDashboard() {
  useRouteChromeRegistration({ title: 'Radiology' });
  const studies = DEMO_RADIOLOGY_STUDIES;
  const statusChart = useMemo(() => buildRadiologyStatusChart(studies), [studies]);
  const modalityChart = useMemo(() => buildRadiologyModalityChart(studies), [studies]);

  const criticalCount = studies.filter((row) => row.status === 'critical').length;
  const pendingReadCount = studies.filter((row) => row.status === 'pending_read').length;
  const preliminaryCount = studies.filter((row) => row.status === 'preliminary').length;

  return (
    <main className="radiology-page" aria-label="Radiology dashboard">
      <header className="radiology-page__header">
        <div className="radiology-page__title-row">
          <GraphicIconBadge iconKey="radiology" accent="brand" size="md" />
          <div>
            <p className="radiology-page-title-text" data-testid="cd-page-title-text">
              Radiology
            </p>
            <p>Demo study queue and read-status triage cards.</p>
          </div>
        </div>
        <div className="radiology-page__actions">
          <Link to={CANONICAL_ROUTES.medical3dViewer}>3D anatomy viewer</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
          <Link to={CANONICAL_ROUTES.tools}>Tools overview</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Radiology source state"
        states={[
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.SIMULATED,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
        ]}
        details="Demo study queue. Use the 3D anatomy viewer, or NEXUS/Canadian C-Spine under Tools, for real imaging-decision support."
      />

      <div className="radiology-page__metrics" role="group" aria-label="Radiology summary metrics">
        <MetricCard
          label="Critical findings"
          value={String(criticalCount)}
          hint="Requires immediate notification"
          tone={criticalCount > 0 ? 'critical' : 'good'}
        />
        <MetricCard
          label="Preliminary"
          value={String(preliminaryCount)}
          hint="Awaiting final read"
          tone={preliminaryCount > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Pending read"
          value={String(pendingReadCount)}
          hint="Not yet reviewed"
          tone="neutral"
        />
        <MetricCard
          label="Studies"
          value={String(studies.length)}
          hint="In current demo queue"
          tone="neutral"
        />
      </div>

      <div className="radiology-page__charts">
        <VisualizationPanel
          title="Read status mix"
          description="Distribution of demo studies by read status."
          badge="Queue"
        >
          <CategoryBarChart
            data={statusChart}
            title="Read status mix"
            color="var(--app-chart-1)"
            emptyMessage="Status chart appears when studies are queued."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Modality mix"
          description="CT, MRI, X-ray, and ultrasound studies in the demo queue."
          badge="Modality"
        >
          <CategoryBarChart
            data={modalityChart}
            title="Modality mix"
            color="var(--app-chart-4)"
            emptyMessage="Modality chart appears when studies are ordered."
          />
        </VisualizationPanel>
      </div>

      <section className="radiology-page__panel" aria-label="Recent studies">
        <h2>Recent studies</h2>
        <p>
          Demo records for training and workflow orientation — not connected to a live PACS/RIS.
        </p>
        <div className="radiology-page__table" role="table" aria-label="Recent studies table">
          <div className="radiology-page__table-head" role="row">
            <span role="columnheader">Study</span>
            <span role="columnheader">Modality</span>
            <span role="columnheader">Patient</span>
            <span role="columnheader">Ordered</span>
            <span role="columnheader">Status</span>
          </div>
          {studies.map((row) => (
            <div key={row.id} className="radiology-page__table-row" role="row">
              <span role="cell">{row.study}</span>
              <span role="cell">{row.modality}</span>
              <span role="cell">{row.patient}</span>
              <span role="cell">{row.orderedAt}</span>
              <span
                role="cell"
                className={`radiology-page__status radiology-page__status--${radiologyStatusTone(row.status)}`}
              >
                {row.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
