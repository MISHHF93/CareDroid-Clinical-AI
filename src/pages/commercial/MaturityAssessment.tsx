import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  buildHospitalReadinessAssessment,
  DEFAULT_HOSPITAL_READINESS_QUESTIONNAIRE,
} from '../../data/hospitalReadinessAssessment';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildReadinessDimensionChart,
  readinessBandTone,
  readinessScoreTone,
} from '../../utils/platformSaasChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './CommercialIntelligence.css';

type QuestionnaireQuestion = {
  id: string;
  question: string;
  options: Array<{ value: number; label: string }>;
};

export function MaturityAssessmentPage() {
  useRouteChromeRegistration({ title: 'Hospital Maturity Assessment' });
  const fallbackQuestionnaire = DEFAULT_HOSPITAL_READINESS_QUESTIONNAIRE;
  const [questionnaire, setQuestionnaire] = useState<{ questions: QuestionnaireQuestion[] }>({
    questions: [...fallbackQuestionnaire.questions],
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sourceState, setSourceState] = useState<
    typeof DEMO_LIVE_STATES.DEMO | typeof DEMO_LIVE_STATES.BACKEND_UNAVAILABLE
  >(DEMO_LIVE_STATES.DEMO);

  useEffect(() => {
    let cancelled = false;

    ProductCatalogApi.getMaturityQuestionnaire()
      .then((payload) => {
        if (cancelled || !payload?.questions?.length) return;
        setQuestionnaire(payload);
        setSourceState(DEMO_LIVE_STATES.DEMO);
      })
      .catch(() => {
        if (cancelled) return;
        setQuestionnaire({ questions: [...fallbackQuestionnaire.questions] });
        setSourceState(DEMO_LIVE_STATES.BACKEND_UNAVAILABLE);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackQuestionnaire.questions]);

  const assessment = useMemo(
    () => (submitted ? buildHospitalReadinessAssessment({ answers }) : null),
    [answers, submitted],
  );
  const dimensionChart = useMemo(
    () => (assessment ? buildReadinessDimensionChart(assessment.dimensions) : []),
    [assessment],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // HEAL-218: rapid double-click fired submitMaturityAssessment twice --
    // the form only unmounts once `submitted` flips true, but that state
    // update doesn't flush in time to block a second click that lands
    // before the first request settles. Every other form's handleSubmit in
    // this codebase already guards this (ConsentFlow.tsx/
    // ReceptionEscalationPanel.tsx's isSubmitting/submitting checks); this
    // one was the only one missing it.
    if (submitting) return;
    setSubmitting(true);
    try {
      await ProductCatalogApi.submitMaturityAssessment(answers);
    } catch {
      // Local demo assessment still renders from questionnaire answers.
    } finally {
      setSubmitting(false);
    }
    setSubmitted(true);
  };

  return (
    <main className="commercial-page" aria-label="Hospital maturity assessment">
      <header className="commercial-page__header">
        <div className="commercial-page__title-row">
          <GraphicIconBadge iconKey="shield-check" accent="brand" size="md" />
          <div>
            <p className="commercial-page-title-text" data-testid="cd-page-title-text">
              Hospital Maturity Assessment
            </p>
            <p>Digital, AI, interoperability, simulation, IoT, and governance readiness scoring.</p>
          </div>
        </div>
        <div className="commercial-page__actions">
          <Link to={CANONICAL_ROUTES.productIntelligence}>Product intelligence</Link>
          <Link to={CANONICAL_ROUTES.expansionOpportunities}>Expansion opportunities</Link>
          <Link to={CANONICAL_ROUTES.organizationIntelligence}>Organization intelligence</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Maturity assessment source state"
        states={
          sourceState === DEMO_LIVE_STATES.BACKEND_UNAVAILABLE
            ? [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]
            : [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LIVE]
        }
        details="Loads questionnaire from product catalog API with local readiness model fallback when backend is unavailable."
      />

      {!submitted ? (
        <form
          className="commercial-page__form"
          onSubmit={handleSubmit}
          aria-label="Maturity questionnaire"
        >
          {questionnaire.questions.map((question) => (
            <div key={question.id} className="commercial-page__question">
              <label htmlFor={`maturity-${question.id}`}>{question.question}</label>
              <select
                id={`maturity-${question.id}`}
                value={answers[question.id] ?? ''}
                required
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: Number(event.target.value),
                  }))
                }
              >
                <option value="" disabled>
                  Select maturity level
                </option>
                {question.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button type="submit" className="commercial-page__submit" disabled={submitting}>
            {submitting ? 'Calculating…' : 'Calculate readiness score'}
          </button>
        </form>
      ) : (
        assessment && (
          <>
            <div
              className="commercial-page__metrics"
              role="group"
              aria-label="Maturity assessment summary metrics"
            >
              <MetricCard
                label="Readiness score"
                value={String(assessment.hospitalReadinessScore)}
                hint="Composite score"
                tone={readinessScoreTone(assessment.hospitalReadinessScore)}
              />
              <MetricCard
                label="Readiness band"
                value={assessment.readinessBand.label}
                hint="Maturity classification"
                tone={readinessBandTone(assessment.readinessBand.id)}
              />
              <MetricCard
                label="Dimensions"
                value={String(assessment.summary.measuredDimensionCount)}
                hint="Measured areas"
                tone="neutral"
              />
              <MetricCard
                label="Recommendations"
                value={String(assessment.summary.recommendationCount)}
                hint="Suggested next steps"
                tone="neutral"
              />
            </div>

            <div className="commercial-page__charts">
              <VisualizationPanel
                title="Readiness dimensions"
                description="Digital, AI, interoperability, simulation, IoT, and governance scores."
                badge="Dimensions"
              >
                <CategoryBarChart
                  data={dimensionChart}
                  title="Readiness dimensions"
                  color="var(--app-chart-1)"
                  emptyMessage="Dimension chart appears after questionnaire submission."
                />
              </VisualizationPanel>
            </div>

            {assessment.dimensions.map((dimension) => (
              <section
                key={dimension.id}
                className="commercial-page__panel"
                aria-label={dimension.label}
              >
                <div className="commercial-page__panel-head">
                  <div>
                    <h2>{dimension.label}</h2>
                    <p>{dimension.signals.join(' · ')}</p>
                  </div>
                  <span
                    className={`commercial-page__pill commercial-page__pill--${readinessBandTone(dimension.level.id)}`}
                  >
                    {dimension.level.label} · {dimension.score}
                  </span>
                </div>
                <ul className="commercial-page__list">
                  {dimension.gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="commercial-page__panel" aria-label="Recommended next steps">
              <h2>Recommended next steps</h2>
              <div className="commercial-page__table" role="table">
                <div
                  className="commercial-page__table-head commercial-page__table-row--two-col"
                  role="row"
                >
                  <span role="columnheader">Category</span>
                  <span role="columnheader">Recommendations</span>
                </div>
                {Object.entries(assessment.recommendations).map(([category, items]) => (
                  <div
                    key={category}
                    className="commercial-page__table-row commercial-page__table-row--two-col"
                    role="row"
                  >
                    <span role="cell">{category.replace(/_/g, ' ')}</span>
                    <span role="cell">{items.join(' · ')}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )
      )}
    </main>
  );
}

export default MaturityAssessmentPage;
