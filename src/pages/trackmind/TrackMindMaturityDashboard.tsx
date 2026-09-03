import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Gauge, AlertTriangle, ArrowUpRight, RotateCcw } from 'lucide-react';
import {
  TRACKMIND_MATURITY_QUESTIONNAIRE,
  TRACKMIND_SCORE_PROVENANCE,
  buildTrackMindMaturityAssessment,
} from '../../config/trackMindMaturityModel';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import './TrackMindMaturityDashboard.css';

/**
 * TrackMind Operating System maturity assessment.
 *
 * routes.config.ts declared this route (`/trackmind-maturity`, componentKey
 * 'TrackMindMaturityDashboard') with status 'future' -- the nine-domain model,
 * its scoring, its questionnaire and its improvement catalog were all built and
 * tested in trackMindMaturityModel.ts, and no page ever rendered them.
 *
 * The one thing this page must not do is print the headline score without
 * saying what is behind it. Only five of the nine domains call a real audit
 * (operations, safety, compliance, security, data quality). The other four
 * return a constant regardless of platform state -- AI governance is literally
 * `return 66`, and facilities/finance/equine welfare compute
 * `base + hardcodedList.length * 6`. That is 40% of the weight behind the
 * overall number. The model now labels each dimension with a `provenance`, and
 * every score on this page is shown next to that label.
 */

type Provenance = (typeof TRACKMIND_SCORE_PROVENANCE)[keyof typeof TRACKMIND_SCORE_PROVENANCE];

type Answers = Record<string, number>;

const EFFORT_LABEL: Record<string, string> = {
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'High effort',
  done: 'Already done',
};

function ProvenanceTag({ provenance }: { provenance: Provenance }) {
  const audited = provenance === TRACKMIND_SCORE_PROVENANCE.AUDITED;
  return (
    <span className="tm-maturity__provenance" data-provenance={provenance}>
      {audited ? 'Measured' : 'Placeholder'}
    </span>
  );
}

export default function TrackMindMaturityDashboard() {
  const [answers, setAnswers] = useState<Answers>({});

  const assessment = useMemo(
    () => buildTrackMindMaturityAssessment({ answers, organizationName: 'This site' }),
    [answers],
  );

  const answeredCount = Object.keys(answers).length;
  const { summary } = assessment;

  const setAnswer = (domainId: string, value: string) => {
    setAnswers((current) => {
      const next = { ...current };
      if (!value) delete next[domainId];
      else next[domainId] = Number(value);
      return next;
    });
  };

  return (
    <main className="tm-maturity" aria-labelledby="tm-maturity-heading">
      <header className="tm-maturity__header">
        <div>
          <p className="tm-maturity__eyebrow">TrackMind Operating System</p>
          <h1 id="tm-maturity-heading">Maturity assessment</h1>
          <p className="tm-maturity__subtitle">
            Nine weighted domains scored against the TrackMind maturity framework, blended with your
            own self-assessment where you provide one.
          </p>
        </div>
        <div className="tm-maturity__score" aria-label="Overall maturity score">
          <strong>{assessment.overallScore}</strong>
          <span>{assessment.overallLevel.label}</span>
        </div>
      </header>

      {/*
        The disclosure is deliberately placed above the score detail, not in a
        footnote. A reader who takes only the headline number away should still
        have seen that 40% of it is not measured.
      */}
      <section className="tm-maturity__coverage" role="note" aria-labelledby="tm-maturity-coverage">
        <h2 id="tm-maturity-coverage">
          <AlertTriangle aria-hidden="true" /> What this score is made of
        </h2>
        <p>
          <strong>
            {summary.auditedDomainCount} of {summary.domainCount} domains
          </strong>{' '}
          ({summary.auditedWeightShare}% of the total weight) are computed from live platform audits
          and move when the platform moves. The remaining{' '}
          <strong>{summary.staticDomainCount}</strong> return a fixed placeholder value regardless
          of platform state, so treat them as a framework default rather than a finding about this
          deployment. Each domain below is labelled.
        </p>
      </section>

      <dl className="tm-maturity__facts">
        <div>
          <dt>Overall level</dt>
          <dd>{assessment.overallLevel.label}</dd>
        </div>
        <div>
          <dt>Weakest domain</dt>
          <dd>{summary.lowestDimension.label}</dd>
        </div>
        <div>
          <dt>Strongest domain</dt>
          <dd>{summary.highestDimension.label}</dd>
        </div>
        <div>
          <dt>Avg. gap to next level</dt>
          <dd>{summary.averageGapToNext}</dd>
        </div>
      </dl>

      <section className="tm-maturity__section" aria-labelledby="tm-maturity-self">
        <h2 id="tm-maturity-self">
          <ShieldCheck aria-hidden="true" /> Self-assessment
        </h2>
        <p className="tm-maturity__note">
          Rate each domain as you see it on the ground. An answer is blended 60/40 with the platform
          score for that domain, so answering changes the numbers above immediately.
          <strong> Answers are not saved</strong> — there is no maturity-assessment backend yet, so
          they live only in this tab and are lost on reload.
        </p>
        <ul className="tm-maturity__questions">
          {TRACKMIND_MATURITY_QUESTIONNAIRE.questions.map((question) => (
            <li key={question.id}>
              <label htmlFor={`tm-q-${question.id}`}>{question.question}</label>
              <select
                id={`tm-q-${question.id}`}
                value={answers[question.id] ?? ''}
                onChange={(event) => setAnswer(question.id, event.target.value)}
              >
                <option value="">Not answered</option>
                {question.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} — {option.label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <p className="tm-maturity__answered">
          {answeredCount
            ? `${answeredCount} of ${TRACKMIND_MATURITY_QUESTIONNAIRE.questions.length} answered.`
            : 'No answers yet — the scores below are platform signals only.'}
          {answeredCount ? (
            <button type="button" className="tm-maturity__reset" onClick={() => setAnswers({})}>
              <RotateCcw aria-hidden="true" /> Clear answers
            </button>
          ) : null}
        </p>
      </section>

      <section className="tm-maturity__section" aria-labelledby="tm-maturity-domains">
        <h2 id="tm-maturity-domains">
          <Gauge aria-hidden="true" /> Domains
        </h2>
        <ul className="tm-maturity__domains">
          {assessment.dimensions.map((dimension) => (
            <li key={dimension.id} className="tm-maturity__domain">
              <div className="tm-maturity__domain-head">
                <div>
                  <h3>{dimension.label}</h3>
                  <p className="tm-maturity__domain-owner">{dimension.ownerLabel}</p>
                </div>
                <div className="tm-maturity__domain-score">
                  <strong>{dimension.score}</strong>
                  <span>{dimension.maturityLevel.label}</span>
                </div>
              </div>

              <p className="tm-maturity__domain-meta">
                <ProvenanceTag provenance={dimension.provenance as Provenance} />
                <span>Weight {dimension.weight}</span>
                {dimension.questionnaireScore !== null ? <span>Includes your answer</span> : null}
                {dimension.gapToNextLevel > 0 ? (
                  <span>{dimension.gapToNextLevel} to next level</span>
                ) : (
                  <span>Top level reached</span>
                )}
              </p>

              <p className="tm-maturity__domain-desc">{dimension.description}</p>

              <p className="tm-maturity__criteria">
                <span>Now</span>
                {dimension.currentCriteria}
              </p>
              {dimension.nextCriteria ? (
                <p className="tm-maturity__criteria tm-maturity__criteria--next">
                  <span>Next</span>
                  {dimension.nextCriteria}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="tm-maturity__section" aria-labelledby="tm-maturity-improvements">
        <h2 id="tm-maturity-improvements">Prioritised improvements</h2>
        {(
          [
            ['Immediate', assessment.recommendations.immediate],
            ['Near term', assessment.recommendations.nearTerm],
            ['Strategic', assessment.recommendations.strategic],
          ] as const
        ).map(([label, items]) =>
          items.length ? (
            <div key={label} className="tm-maturity__improvement-group">
              <h3>{label}</h3>
              <ul className="tm-maturity__improvements">
                {items.map((item) => (
                  <li key={item.id}>
                    <strong>{item.id}</strong>
                    <span>{item.summary}</span>
                    <em data-effort={item.effort}>{EFFORT_LABEL[item.effort] || item.effort}</em>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </section>

      <p className="tm-maturity__footer">
        <Link to={CANONICAL_ROUTES.trackMindWorkspace}>
          Back to the TrackMind workspace
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </p>
    </main>
  );
}
