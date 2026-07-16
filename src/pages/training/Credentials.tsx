import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildCompetencyCredentialingSnapshot } from '../../data/competencyCredentialingCatalog';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildCredentialStatusChart, credentialStatusTone } from '../../utils/simulationChartModel';
import './Credentials.css';

export default function Credentials() {
  const snapshot = useMemo(
    () => buildCompetencyCredentialingSnapshot({ role: 'medical student', specialty: 'medical education' }),
    [],
  );
  const statusChart = useMemo(() => buildCredentialStatusChart(snapshot.credentialRecords), [snapshot.credentialRecords]);

  return (
    <main className="credentials-page" aria-label="Credentialing platform">
      <header className="credentials-page__header">
        <div className="credentials-page__title-row">
          <GraphicIconBadge iconKey="shield-check" accent="brand" size="md" />
          <div>
            <h1>Credentialing Platform</h1>
            <p>Certifications, renewal status, CME credits, and credential readiness for demo training review.</p>
          </div>
        </div>
        <div className="credentials-page__actions">
          <Link to="/competencies">Competencies</Link>
          <Link to={CANONICAL_ROUTES.simulationOutcomes}>Simulation outcomes</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Credentialing source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details={snapshot.safetyLabel}
      />

      <div className="credentials-page__metrics" role="group" aria-label="Credentialing summary metrics">
        <MetricCard
          label="Active credentials"
          value={String(snapshot.summary.activeCredentials)}
          hint="Currently valid certifications"
          tone="good"
        />
        <MetricCard
          label="Total credentials"
          value={String(snapshot.summary.totalCredentials)}
          hint="Tracked in demo catalog"
          tone="neutral"
        />
        <MetricCard
          label="CME earned"
          value={String(snapshot.summary.cmeCreditsEarned)}
          hint={`Target ${snapshot.summary.cmeCreditsTarget}`}
          tone="neutral"
        />
        <MetricCard
          label="CME progress"
          value={`${Math.round((snapshot.summary.cmeCreditsEarned / snapshot.summary.cmeCreditsTarget) * 100)}%`}
          hint="Toward annual demo target"
          tone="good"
        />
      </div>

      <VisualizationPanel
        title="Credential status mix"
        description="Active, renewal-due, and in-progress credentials in the demo catalog."
        badge="Status"
      >
        <CategoryBarChart
          data={statusChart}
          title="Credential status mix"
          color="var(--app-chart-2)"
          emptyMessage="Status chart appears when credential records are available."
        />
      </VisualizationPanel>

      <section className="credentials-page__panel" aria-label="Credential records">
        <h2>Credential records</h2>
        <div className="credentials-page__table" role="table">
          <div className="credentials-page__table-head" role="row">
            <span role="columnheader">Credential</span>
            <span role="columnheader">Issuer</span>
            <span role="columnheader">Credits</span>
            <span role="columnheader">Expires</span>
            <span role="columnheader">Status</span>
          </div>
          {snapshot.credentialRecords.map((record) => (
            <div key={record.id} className="credentials-page__table-row" role="row">
              <span role="cell">{record.title}</span>
              <span role="cell">{record.issuer}</span>
              <span role="cell">{record.credits}</span>
              <span role="cell">{record.expiresAt || '—'}</span>
              <span
                role="cell"
                className={`credentials-page__status credentials-page__status--${credentialStatusTone(record.status)}`}
              >
                {record.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}