import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  EVIDENCE_SUMMARIES,
  GUIDELINE_LIBRARY,
  LITERATURE_LIBRARY,
  getResearchHubSnapshot,
  resolveResearchWorkflowLinks,
  searchResearchHub,
} from '../../data/researchEvidenceHub';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildResearchSectionChart } from '../../utils/clinicalInsightsChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './ResearchEvidenceHub.css';

export default function ResearchEvidenceHub() {
  useRouteChromeRegistration({ title: 'Research and Evidence Hub' });
  const [query, setQuery] = useState('');
  const snapshot = useMemo(() => getResearchHubSnapshot(), []);
  const sectionChart = useMemo(() => buildResearchSectionChart(snapshot), [snapshot]);
  const results = useMemo(() => searchResearchHub(query), [query]);

  return (
    <main className="research-hub-page" aria-label="Research and evidence hub">
      <header className="research-hub-page__header">
        <div className="research-hub-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <p className="research-hub-title-text" data-testid="cd-page-title-text">
              Research and Evidence Hub
            </p>
            <p>
              Literature, guidelines, evidence summaries, study tracking, and citation exploration.
            </p>
          </div>
        </div>
        <div className="research-hub-page__actions">
          <Link to={CANONICAL_ROUTES.clinicalDecisionSupport}>Clinical decision support</Link>
          <Link to={CANONICAL_ROUTES.protocols}>Protocols</Link>
          <Link to={CANONICAL_ROUTES.simulation}>Simulation suite</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Research hub source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED]}
        details={snapshot.safetyLabel}
      />

      <div
        className="research-hub-page__metrics"
        role="group"
        aria-label="Research hub summary metrics"
      >
        <MetricCard
          label="Literature"
          value={String(snapshot.literatureCount)}
          hint="Demo evidence digests"
          tone="neutral"
        />
        <MetricCard
          label="Guidelines"
          value={String(snapshot.guidelineCount)}
          hint="Summarized pathways"
          tone="neutral"
        />
        <MetricCard
          label="Summaries"
          value={String(snapshot.evidenceSummaryCount)}
          hint="Bottom-line briefs"
          tone="good"
        />
        <MetricCard
          label="Studies tracked"
          value={String(snapshot.trackedStudyCount)}
          hint="Active study tracker"
          tone="neutral"
        />
      </div>

      <VisualizationPanel
        title="Evidence library sections"
        description="Volume across literature, guidelines, summaries, studies, and citations."
        badge="Library"
      >
        <CategoryBarChart
          data={sectionChart}
          title="Evidence library sections"
          color="var(--app-chart-1)"
          emptyMessage="Section chart appears when evidence libraries are loaded."
        />
      </VisualizationPanel>

      <input
        type="search"
        className="research-hub-page__search"
        placeholder="Search literature, guidelines, summaries, studies…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search research hub"
      />

      <div className="research-hub-page__panels">
        <section className="research-hub-page__panel" aria-label="Literature library">
          <h2>Literature library</h2>
          {results.literature.map((item) => {
            const links = resolveResearchWorkflowLinks(item);
            return (
              <article key={item.id} className="research-hub-page__card">
                <strong>{item.title}</strong>
                <span>
                  {item.source} · {item.year} · {item.evidenceLevel}
                </span>
                <p>{item.summary}</p>
                <div className="research-hub-page__card-links">
                  {links.simulations.map((link) => (
                    <Link key={link.id} to={link.path}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="research-hub-page__panel" aria-label="Guidelines and summaries">
          <h2>Guideline summaries</h2>
          {results.guidelines.slice(0, 3).map((guideline) => (
            <article key={guideline.id} className="research-hub-page__card">
              <strong>{guideline.title}</strong>
              <span>
                {guideline.publisher} · {guideline.version}
              </span>
              <ul>
                {guideline.keyRecommendations.map((rec) => (
                  <li key={rec}>{rec}</li>
                ))}
              </ul>
            </article>
          ))}
          <h2>Evidence summaries</h2>
          {results.summaries.map((summary) => (
            <article key={summary.id} className="research-hub-page__card">
              <strong>{summary.topic}</strong>
              <span>Certainty: {summary.certainty}</span>
              <p>{summary.bottomLine}</p>
            </article>
          ))}
        </section>
      </div>

      {!query ? (
        <p className="research-hub-page__hint">
          Showing {LITERATURE_LIBRARY.length} literature items, {GUIDELINE_LIBRARY.length}{' '}
          guidelines, and {EVIDENCE_SUMMARIES.length} summaries in demo mode.
        </p>
      ) : null}
    </main>
  );
}
