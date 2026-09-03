import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Building2, CheckCircle2, Circle } from 'lucide-react';
import { buildEnterpriseOperatingPlatformAssessment } from '../../config/enterpriseOperatingPlatformModel';
import { ENTERPRISE_PLATFORM_PROVENANCE } from '../../config/enterpriseOperatingPlatformRegistry';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import './EnterpriseOperatingPlatformHub.css';

/**
 * Enterprise operating platform hub (`/enterprise-platform`).
 *
 * routes.config.ts declared this route with componentKey
 * 'EnterpriseOperatingPlatformHub' and status 'future'. The 18-module model
 * (enterpriseOperatingPlatformModel.ts, ~720 lines, with its own tests) has
 * existed unrendered, and ED_EXTENSION_ROUTE_REDIRECTS folded the path into
 * /emergency/settings because no page existed.
 *
 * Ten of the eighteen modules read something outside the module
 * (auditTrackMindMaturity, evaluateOperationalSurvivabilityKpis,
 * simulateClinicOnboarding, buildCustomerSuccessPlatformAssessment). The other
 * eight score a list maintained inside the model file. As on the sibling
 * platform-intelligence hub, that split is stated above the numbers rather than
 * left for a reader to assume the headline was measured.
 */

type Filter = 'all' | 'live' | 'registry';

const STATUS_TONE: Record<string, string> = {
  ready: 'ready',
  progressing: 'progressing',
  watch: 'watch',
  'at-risk': 'at-risk',
};

export default function EnterpriseOperatingPlatformHub() {
  const [filter, setFilter] = useState<Filter>('all');

  const assessment = useMemo(() => buildEnterpriseOperatingPlatformAssessment({}), []);
  const { summary } = assessment;
  const liveCount = assessment.liveModuleCount;
  const registryCount = assessment.registryModuleCount;
  const total = assessment.modules.length;
  const livePercent = Math.round((liveCount / total) * 100);

  const modules = useMemo(
    () =>
      assessment.modules.filter((module) =>
        filter === 'all' ? true : module.provenance === filter,
      ),
    [assessment.modules, filter],
  );

  return (
    <main className="eop-hub" aria-labelledby="eop-hub-heading">
      <header className="eop-hub__header">
        <div>
          <p className="eop-hub__eyebrow">TrackMind platform</p>
          <h1 id="eop-hub-heading">Enterprise operating platform</h1>
          <p className="eop-hub__subtitle">
            Eighteen enterprise modules — benchmarking and franchise readiness, continuity and
            disaster recovery, workforce and competency, governance, ESG and architecture.
          </p>
        </div>
        <div className="eop-hub__score" aria-label="Overall enterprise platform score">
          <strong>{assessment.overallScore}</strong>
          <span>{assessment.overallStatus}</span>
        </div>
      </header>

      <section className="eop-hub__coverage" role="note" aria-labelledby="eop-hub-coverage">
        <h2 id="eop-hub-coverage">
          <AlertTriangle aria-hidden="true" /> Read the score with this
        </h2>
        <p>
          <strong>
            {liveCount} of {total} modules
          </strong>{' '}
          ({livePercent}%) score from an audit outside the module, so they move when the platform
          moves. The other <strong>{registryCount}</strong> score a list maintained inside the
          model file — a real curated inventory, but a document rather than a measurement of this
          deployment. Every card below is tagged.
        </p>
      </section>

      <dl className="eop-hub__facts">
        <div>
          <dt>Modules ready</dt>
          <dd>
            {summary.readyModules} / {summary.moduleCount}
          </dd>
        </div>
        <div>
          <dt>Watch or at risk</dt>
          <dd>{summary.watchOrAtRisk}</dd>
        </div>
        <div>
          <dt>Module KPIs passing</dt>
          <dd>
            {summary.kpisPassed} / {summary.kpisTotal}
          </dd>
        </div>
        <div>
          <dt>Weakest module</dt>
          <dd>{summary.lowestModule?.label || '—'}</dd>
        </div>
      </dl>

      <div className="eop-hub__filters" role="group" aria-label="Filter modules by score source">
        {(
          [
            ['all', `All ${total}`],
            ['live', `Tracks platform (${liveCount})`],
            ['registry', `Self-reported (${registryCount})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="eop-hub__filter"
            data-active={filter === value ? 'true' : 'false'}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="eop-hub__modules">
        {modules.map((module) => (
          <li key={module.id} className="eop-hub__module">
            <div className="eop-hub__module-head">
              <div>
                <h2>{module.label}</h2>
                <p className="eop-hub__module-desc">{module.description}</p>
              </div>
              <div className="eop-hub__module-score">
                <strong>{module.assessment.score}</strong>
                <span data-status={STATUS_TONE[module.assessment.status] || 'progressing'}>
                  {module.assessment.status}
                </span>
              </div>
            </div>

            <p className="eop-hub__module-meta">
              <span className="eop-hub__provenance" data-provenance={module.provenance}>
                {module.provenance === ENTERPRISE_PLATFORM_PROVENANCE.LIVE
                  ? 'Tracks platform'
                  : 'Self-reported'}
              </span>
              <span>
                {module.assessment.passedKpis}/{module.assessment.totalKpis} KPIs
              </span>
            </p>

            <ul className="eop-hub__kpis">
              {module.assessment.kpis.map((entry) => (
                <li key={entry.id} data-passes={entry.passes ? 'true' : 'false'}>
                  {entry.passes ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
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
        ))}
      </ul>

      <p className="eop-hub__footer">
        <Link to={CANONICAL_ROUTES.platformIntelligence}>
          <Building2 aria-hidden="true" />
          Platform intelligence
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
