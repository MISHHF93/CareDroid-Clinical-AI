import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Circle } from 'lucide-react';
import {
  buildPlatformIntelligenceAssessment,
} from '../../config/platformIntelligenceModel';
import { PLATFORM_INTELLIGENCE_PROVENANCE } from '../../config/platformIntelligenceRegistry';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import './PlatformIntelligenceHub.css';

/**
 * Platform intelligence hub (`/platform-intelligence`).
 *
 * routes.config.ts declared this route with componentKey
 * 'PlatformIntelligenceHub' and status 'future'. The 20-module model behind it
 * (platformIntelligenceModel.ts, ~800 lines, with its own tests) has existed
 * for a while with nothing rendering it, and ED_EXTENSION_ROUTE_REDIRECTS
 * folded the path into /emergency/settings because no page existed.
 *
 * Eleven of the twenty modules score from a real audit or inventory outside
 * the module. The other nine score themselves from lists maintained inside
 * platformIntelligenceModel.ts -- assessKpiIntelligence takes `_signals`,
 * underscored and deliberately unused, and always returns 88. Several of those
 * nine score themselves 100. So the headline number is not a measurement of
 * this deployment, and this page says which half is which rather than printing
 * "89 / ready" and letting a reader assume it was measured.
 */

const STATUS_TONE: Record<string, string> = {
  ready: 'ready',
  progressing: 'progressing',
  emerging: 'emerging',
  planned: 'planned',
};

type Filter = 'all' | 'live' | 'registry';

export default function PlatformIntelligenceHub() {
  const [filter, setFilter] = useState<Filter>('all');

  const assessment = useMemo(() => buildPlatformIntelligenceAssessment({}), []);
  const { summary } = assessment;

  const modules = useMemo(
    () =>
      assessment.modules.filter((module) =>
        filter === 'all' ? true : module.provenance === filter,
      ),
    [assessment.modules, filter],
  );

  const livePercent = Math.round((summary.liveModuleCount / summary.moduleCount) * 100);

  return (
    <main className="pi-hub" aria-labelledby="pi-hub-heading">
      <header className="pi-hub__header">
        <div>
          <p className="pi-hub__eyebrow">TrackMind platform</p>
          <h1 id="pi-hub-heading">Platform intelligence</h1>
          <p className="pi-hub__subtitle">
            Twenty intelligence modules — artifact registry, data catalog and lineage, KPI and
            cross-domain analytics, tenant and track health, governance and observability.
          </p>
        </div>
        <div className="pi-hub__score" aria-label="Overall platform intelligence score">
          <strong>{assessment.overallScore}</strong>
          <span>{assessment.overallStatus}</span>
        </div>
      </header>

      {/*
        Placed above the numbers on purpose. The overall score is a self-assessment
        and reads as far rosier than the platform is; a reader must not take it as
        an external measurement.
      */}
      <section className="pi-hub__coverage" role="note" aria-labelledby="pi-hub-coverage">
        <h2 id="pi-hub-coverage">
          <AlertTriangle aria-hidden="true" /> Read the score with this
        </h2>
        <p>
          <strong>
            {summary.liveModuleCount} of {summary.moduleCount} modules
          </strong>{' '}
          ({livePercent}%) score from an audit or inventory outside the module, so they move when
          the platform moves. The other <strong>{summary.registryModuleCount}</strong> score
          themselves from lists maintained inside the model file — a real curated inventory, but
          a document rather than a measurement of this deployment, and several of them rate
          themselves 100. Every card below is tagged.
        </p>
      </section>

      <dl className="pi-hub__facts">
        <div>
          <dt>Modules ready</dt>
          <dd>
            {summary.readyModules} / {summary.moduleCount}
          </dd>
        </div>
        <div>
          <dt>Module KPIs passing</dt>
          <dd>
            {summary.kpisPassed} / {summary.kpisTotal}
          </dd>
        </div>
        <div>
          <dt>Tracks the platform</dt>
          <dd>{summary.liveModuleCount}</dd>
        </div>
        <div>
          <dt>Self-reported</dt>
          <dd>{summary.registryModuleCount}</dd>
        </div>
      </dl>

      <div className="pi-hub__filters" role="group" aria-label="Filter modules by score source">
        {(
          [
            ['all', `All ${summary.moduleCount}`],
            ['live', `Tracks platform (${summary.liveModuleCount})`],
            ['registry', `Self-reported (${summary.registryModuleCount})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="pi-hub__filter"
            data-active={filter === value ? 'true' : 'false'}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="pi-hub__modules">
        {modules.map((module) => {
          const live = module.provenance === PLATFORM_INTELLIGENCE_PROVENANCE.LIVE;
          return (
            <li key={module.id} className="pi-hub__module">
              <div className="pi-hub__module-head">
                <div>
                  <h2>{module.label}</h2>
                  <p className="pi-hub__module-desc">{module.description}</p>
                </div>
                <div className="pi-hub__module-score">
                  <strong>{module.assessment.score}</strong>
                  <span data-status={STATUS_TONE[module.assessment.status] || 'planned'}>
                    {module.assessment.status}
                  </span>
                </div>
              </div>

              <p className="pi-hub__module-meta">
                <span className="pi-hub__provenance" data-provenance={module.provenance}>
                  {live ? 'Tracks platform' : 'Self-reported'}
                </span>
                <span>
                  {module.assessment.passedKpis}/{module.assessment.totalKpis} KPIs
                </span>
              </p>

              <ul className="pi-hub__kpis">
                {module.assessment.kpis.map((entry) => (
                  <li key={entry.id} data-passes={entry.passes ? 'true' : 'false'}>
                    {entry.passes ? (
                      <CheckCircle2 aria-hidden="true" />
                    ) : (
                      <Circle aria-hidden="true" />
                    )}
                    <span>{entry.label}</span>
                    <em>
                      {entry.value}
                      {entry.unit || ''}
                      <small>
                        {entry.maxTarget ? ' max ' : ' target '}
                        {entry.target}
                      </small>
                    </em>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <p className="pi-hub__footer">
        <Link to={CANONICAL_ROUTES.trackMindWorkspace}>
          <Activity aria-hidden="true" />
          TrackMind workspace
          <ArrowUpRight aria-hidden="true" />
        </Link>
        <Link to={CANONICAL_ROUTES.trackMindMaturity}>
          Maturity assessment
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </p>
    </main>
  );
}
