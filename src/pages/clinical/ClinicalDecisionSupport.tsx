import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  buildClinicalDecisionSupportPlan,
  DEFAULT_SYMPTOMS,
} from '../../data/clinicalDecisionSupportEngine';
import { getUserFacingToolRegistryProjection } from '../../data/toolInventory';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildCdsSignalRiskChart, riskLevelTone } from '../../utils/clinicalInsightsChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './ClinicalDecisionSupport.css';

export default function ClinicalDecisionSupport() {
  useRouteChromeRegistration({ title: 'Clinical Decision Support Engine' });
  const [symptoms, setSymptoms] = useState(DEFAULT_SYMPTOMS);
  const calculatorInventory = useMemo(
    () =>
      getUserFacingToolRegistryProjection().filter(
        (tool) => tool.category === 'Calculator' || String(tool.path || '').includes('/calculators/'),
      ),
    [],
  );

  const plan = useMemo(
    () =>
      buildClinicalDecisionSupportPlan({
        symptoms,
        patientContext: { age: '68', vitals: 'tachycardia, diaphoresis', history: 'hypertension' },
        profile: { role: 'emergency physician', specialty: 'emergency medicine' },
        activeWorkspaceId: 'diagnostic',
        calculatorInventory,
      }),
    [symptoms, calculatorInventory],
  );

  const riskChart = useMemo(() => buildCdsSignalRiskChart(plan.signals), [plan.signals]);

  return (
    <main className="cds-page" aria-label="Clinical decision support engine">
      <header className="cds-page__header">
        <div className="cds-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <p className="cds-page-title-text" data-testid="cd-page-title-text">Clinical Decision Support Engine</p>
            <p>Symptom-driven risk signals, calculator recommendations, labs, imaging, and escalation framing.</p>
          </div>
        </div>
        <div className="cds-page__actions">
          <Link to={CANONICAL_ROUTES.research}>Research hub</Link>
          <Link to={CANONICAL_ROUTES.protocols}>Protocols</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Clinical decision support source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details={plan.safetyLabel}
      />

      <div className="cds-page__metrics" role="group" aria-label="CDS summary metrics">
        <MetricCard
          label="Risk level"
          value={plan.riskLevel}
          hint="Highest matched signal"
          tone={riskLevelTone(plan.riskLevel)}
        />
        <MetricCard label="Signals" value={String(plan.signals.length)} hint="Matched risk patterns" tone="neutral" />
        <MetricCard
          label="Calculators"
          value={String(plan.calculatorRecommendations.length)}
          hint="Inventory-backed picks"
          tone="neutral"
        />
        <MetricCard
          label="Escalations"
          value={String(plan.escalationSuggestions.length)}
          hint="Safety triggers to review"
          tone={plan.riskLevel === 'critical' ? 'critical' : 'warning'}
        />
      </div>

      <section className="cds-page__panel" aria-label="Presentation input">
        <h2>Presentation context</h2>
        <textarea
          className="cds-page__input"
          value={symptoms}
          onChange={(event) => setSymptoms(event.target.value)}
          rows={4}
          aria-label="Symptom presentation"
        />
      </section>

      <div className="cds-page__charts">
        <VisualizationPanel title="Matched signal risk" description="Risk weight of detected clinical signal patterns." badge="Signals">
          <CategoryBarChart
            data={riskChart}
            title="Matched signal risk"
            color="var(--app-chart-5)"
            emptyMessage="Signal chart appears when symptoms match known patterns."
          />
        </VisualizationPanel>
        <section className="cds-page__panel" aria-label="Matched signals list">
          <h2>Matched signals</h2>
          <ul className="cds-page__list">
            {plan.signals.map((signal) => (
              <li key={signal.id}>
                <strong>{signal.label}</strong> — {signal.risk} ({signal.matchedKeywords.join(', ')})
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="cds-page__grid">
        <section className="cds-page__panel" aria-label="Calculator recommendations">
          <h2>Calculator recommendations</h2>
          <div className="cds-page__links">
            {plan.calculatorRecommendations.map((calculator) => (
              <Link key={calculator.id} to={calculator.path || CANONICAL_ROUTES.tools}>
                <strong>{calculator.name}</strong>
                <span>{calculator.reason}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="cds-page__panel" aria-label="Workflow labs imaging escalation">
          <h2>Workflow, labs, imaging, escalation</h2>
          <h3>Workflows</h3>
          <ul>{plan.workflowRecommendations.map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Labs</h3>
          <ul>{plan.labRecommendations.map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Imaging</h3>
          <ul>{plan.imagingRecommendations.map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Escalation</h3>
          <ul>{plan.escalationSuggestions.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <section className="cds-page__panel" aria-label="Explainability and limitations">
        <h2>Explainability</h2>
        <p>{plan.explainability.profileContext}</p>
        <p>{plan.explainability.workspaceContext}</p>
        <p>{plan.explainability.inventoryContext}</p>
        <ul>
          {plan.explainability.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}