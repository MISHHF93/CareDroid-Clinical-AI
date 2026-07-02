import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildCompetencyCredentialingSnapshot } from '../../data/competencyCredentialingCatalog';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildCompetencyStatusChart, competencyStatusTone } from '../../utils/simulationChartModel';
import './Competencies.css';

export default function Competencies() {
  const snapshot = useMemo(
    () => buildCompetencyCredentialingSnapshot({ role: 'medical student', specialty: 'medical education' }),
    [],
  );
  const statusChart = useMemo(() => buildCompetencyStatusChart(snapshot.competencyRecords), [snapshot.competencyRecords]);

  return (
    <main className="competencies-page" aria-label="Competency platform">
      <header className="competencies-page__header">
        <div className="competencies-page__title-row">
          <GraphicIconBadge iconKey="shield-check" accent="brand" size="md" />
          <div>
            <h1>Competency Platform</h1>
            <p>Simulation completion, skill progress, training gaps, and recommended practice actions.</p>
          </div>
        </div>
        <div className="competencies-page__actions">
          <Link to={CANONICAL_ROUTES.simulation}>Simulation suite</Link>
          <Link to={CANONICAL_ROUTES.simulationOutcomes}>Outcomes</Link>
          <Link to="/credentials">Credentials</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Competency source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details={snapshot.safetyLabel}
      />

      <div className="competencies-page__metrics" role="group" aria-label="Competency summary metrics">
        <MetricCard
          label="Simulation completion"
          value={`${snapshot.summary.simulationCompletion}%`}
          hint="Completed simulation modules"
          tone="good"
        />
        <MetricCard
          label="Skill completion"
          value={`${snapshot.summary.skillCompletion}%`}
          hint="Completed skill checkpoints"
          tone="neutral"
        />
        <MetricCard
          label="Overall readiness"
          value={`${snapshot.summary.overallReadiness}%`}
          hint="Blended competency progress"
          tone={snapshot.summary.overallReadiness >= 80 ? 'good' : 'warning'}
        />
        <MetricCard
          label="Training status"
          value={snapshot.summary.trainingStatus}
          hint="Current training posture"
          tone={snapshot.summary.trainingStatus === 'on-track' ? 'good' : 'warning'}
        />
      </div>

      <VisualizationPanel
        title="Competency status mix"
        description="Completed, in-progress, and needs-practice records in the demo catalog."
        badge="Status"
      >
        <CategoryBarChart
          data={statusChart}
          title="Competency status mix"
          color="var(--app-chart-3)"
          emptyMessage="Status chart appears when competency records are available."
        />
      </VisualizationPanel>

      <div className="competencies-page__panels">
        <section className="competencies-page__panel" aria-label="Competency records">
          <h2>Competency records</h2>
          <div className="competencies-page__records">
            {snapshot.competencyRecords.map((record) => (
              <article key={record.id} className="competencies-page__record">
                <strong>{record.title}</strong>
                <span>{record.domain}</span>
                <span>{record.progress}% · {record.status}</span>
                <span className={`competencies-page__status competencies-page__status--${competencyStatusTone(record.status)}`}>
                  {record.evidence}
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="competencies-page__panel" aria-label="Competency gaps and actions">
          <h2>Gaps and recommended actions</h2>
          <h3>Competency gaps</h3>
          <ul>
            {snapshot.competencyGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
          <h3>Recommended actions</h3>
          <ul>
            {snapshot.recommendedActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}