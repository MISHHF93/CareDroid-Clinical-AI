import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useTenantContext } from '../contexts/TenantContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import {
  TRACKMIND_MATURITY_DOMAINS,
  TRACKMIND_MATURITY_LEVELS,
  TRACKMIND_MATURITY_QUESTIONNAIRE,
  buildTrackMindMaturityAssessment,
} from '../config/trackMindMaturityModel';
import './TrackMindMaturityDashboard.css';

function levelClass(levelId) {
  return `trackmind-level trackmind-level--${String(levelId || 'initial')}`;
}

export default function TrackMindMaturityDashboard() {
  const { tenantContext } = useTenantContext();
  const { organization: identityOrganization, platformContext } = useUserIdentity();
  const organizationContext = useOrganizationContext();
  const organization =
    organizationContext?.organization || identityOrganization || platformContext?.organization || {};

  const [answers, setAnswers] = useState({});
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  const organizationName =
    organization?.name || tenantContext?.organizationName || 'Current operating site';

  const assessment = useMemo(
    () =>
      buildTrackMindMaturityAssessment({
        answers,
        organizationName,
        signals: {
          emergencyApiAuthenticated: true,
          orgScopedSettings: true,
          storeHydration: true,
          clinicProvisioned: true,
          edRbacWired: true,
          orgScopedEmergencySettingsService: true,
        },
      }),
    [answers, organizationName],
  );

  const radarData = assessment.dimensions.map((dimension) => ({
    domain: dimension.label,
    score: dimension.score,
    fullMark: 100,
  }));

  const managedCount = assessment.summary.managedOrAboveCount;
  const hasAnswers = Object.keys(answers).length > 0;

  return (
    <div className="trackmind-dashboard">
      <header className="trackmind-hero">
        <div>
          <p className="trackmind-eyebrow">TrackMind maturity framework</p>
          <h1>{organizationName}</h1>
          <p>
            Operating system maturity across operations, safety, compliance, security, equine
            welfare, facilities, finance, AI governance, and data quality. Scores blend platform
            audit signals with optional self-assessment inputs.
          </p>
        </div>
        <div className="trackmind-score-card">
          <span>Overall maturity</span>
          <strong>{assessment.overallScore}</strong>
          <em className={levelClass(assessment.overallLevel.id)}>{assessment.overallLevel.label}</em>
        </div>
      </header>

      <section className="trackmind-summary" aria-label="Maturity summary">
        <article>
          <span>Domains measured</span>
          <strong>{assessment.summary.domainCount}</strong>
        </article>
        <article>
          <span>Managed or above</span>
          <strong>
            {managedCount}/{assessment.summary.domainCount}
          </strong>
        </article>
        <article>
          <span>Optimizing domains</span>
          <strong>{assessment.summary.optimizingCount}</strong>
        </article>
        <article>
          <span>Assessment mode</span>
          <strong>{hasAnswers ? 'Blended' : 'Platform signals'}</strong>
        </article>
      </section>

      <section className="trackmind-layout">
        <div className="trackmind-radar-panel">
          <div className="trackmind-panel-header">
            <h2>Maturity radar</h2>
            <p>Nine-domain operating system profile</p>
          </div>
          <div className="trackmind-radar-chart" aria-label="TrackMind maturity radar chart">
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="var(--panel-border)" />
                <PolarAngleAxis dataKey="domain" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Radar
                  name="Maturity score"
                  dataKey="score"
                  stroke="var(--app-accent-interactive)"
                  fill="var(--app-accent-interactive)"
                  fillOpacity={0.28}
                />
                <Tooltip
                  formatter={(value) => [`${value}/100`, 'Score']}
                  contentStyle={{
                    background: 'var(--panel-background)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="trackmind-levels-panel">
          <div className="trackmind-panel-header">
            <h2>Maturity levels</h2>
            <p>Five-level TrackMind scale</p>
          </div>
          <ol className="trackmind-level-scale">
            {TRACKMIND_MATURITY_LEVELS.map((level) => (
              <li key={level.id} className={levelClass(level.id)}>
                <strong>
                  L{level.level} · {level.label}
                </strong>
                <span>{level.summary}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="trackmind-actions-bar">
        <div>
          <h2>Self-assessment</h2>
          <p>
            Optional questionnaire blends your site&apos;s self-rating with live platform audit
            signals. Leave blank to view signal-only scores.
          </p>
        </div>
        <button
          type="button"
          className="trackmind-toggle-btn"
          onClick={() => setShowQuestionnaire((open) => !open)}
        >
          {showQuestionnaire ? 'Hide questionnaire' : 'Open questionnaire'}
        </button>
      </section>

      {showQuestionnaire ? (
        <section className="trackmind-questionnaire" aria-label="TrackMind maturity questionnaire">
          {TRACKMIND_MATURITY_QUESTIONNAIRE.questions.map((question) => (
            <fieldset key={question.id} className="trackmind-question">
              <legend>{question.question}</legend>
              <div className="trackmind-options">
                {question.options.map((option) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name={question.id}
                      value={option.value}
                      checked={answers[question.id] === option.value}
                      onChange={() =>
                        setAnswers((current) => ({ ...current, [question.id]: option.value }))
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </section>
      ) : null}

      <section className="trackmind-grid" aria-label="TrackMind maturity domains">
        {assessment.dimensions.map((dimension) => (
          <article key={dimension.id} className="trackmind-card">
            <div className="trackmind-card-header">
              <div>
                <span>{dimension.weight}% weight · {dimension.owner}</span>
                <h2>{dimension.label}</h2>
              </div>
              <strong>{dimension.score}</strong>
            </div>
            <span className={levelClass(dimension.maturityLevel.id)}>
              L{dimension.maturityLevel.level} · {dimension.maturityLevel.label}
            </span>
            <p>{dimension.description}</p>
            <div className="trackmind-criteria">
              <span>Current state</span>
              <p>{dimension.currentCriteria}</p>
            </div>
            {dimension.nextCriteria ? (
              <div className="trackmind-next">
                <span>Next level ({dimension.gapToNextLevel} pts)</span>
                <p>{dimension.nextCriteria}</p>
              </div>
            ) : null}
            <ul className="trackmind-indicators">
              {dimension.indicators.map((indicator) => (
                <li key={indicator}>{indicator}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="trackmind-recommendations" aria-label="Improvement recommendations">
        <div className="trackmind-panel-header">
          <h2>Prioritized improvements</h2>
          <p>Action catalog ordered by urgency across all domains</p>
        </div>
        <div className="trackmind-rec-columns">
          <article>
            <h3>Immediate (P0)</h3>
            <ul>
              {assessment.recommendations.immediate.map((item) => (
                <li key={item.id}>
                  <strong>{item.summary}</strong>
                  <span>{TRACKMIND_MATURITY_DOMAINS.find((d) => d.id === item.domain)?.label}</span>
                </li>
              ))}
            </ul>
          </article>
          <article>
            <h3>Near term (P1)</h3>
            <ul>
              {assessment.recommendations.nearTerm.map((item) => (
                <li key={item.id}>
                  <strong>{item.summary}</strong>
                  <span>{TRACKMIND_MATURITY_DOMAINS.find((d) => d.id === item.domain)?.label}</span>
                </li>
              ))}
            </ul>
          </article>
          <article>
            <h3>Strategic (P2)</h3>
            <ul>
              {assessment.recommendations.strategic.map((item) => (
                <li key={item.id}>
                  <strong>{item.summary}</strong>
                  <span>{TRACKMIND_MATURITY_DOMAINS.find((d) => d.id === item.domain)?.label}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="trackmind-links" aria-label="Related maturity surfaces">
        <div>
          <h2>Related dashboards</h2>
          <p>Drill into domain evidence and platform readiness artifacts.</p>
        </div>
        <div>
          <Link to="/enterprise-readiness">Enterprise readiness</Link>
          <Link to="/maturity-assessment">Hospital maturity assessment</Link>
          <Link to="/ai-governance">AI governance</Link>
          <Link to="/governance-registry">Governance registry</Link>
          <Link to="/security">Security review</Link>
        </div>
      </section>
    </div>
  );
}
