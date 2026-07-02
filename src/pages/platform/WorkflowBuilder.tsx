import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { COMMAND_CENTER_WORKFLOW_ACTIONS } from '../../config/operationalWorkflow.config';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { WORKFLOW_MINING_JOURNEYS } from '../../data/workflowMiningEngine';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildWorkflowPriorityChart } from '../../utils/platformSaasChartModel';
import './WorkflowBuilder.css';

const WORKFLOW_TONE_CLASS: Record<string, string> = {
  critical: 'critical',
  warning: 'warning',
  info: 'neutral',
  success: 'good',
};

export function WorkflowBuilderPage() {
  const priorityChart = useMemo(() => buildWorkflowPriorityChart(), []);
  const actionCount = COMMAND_CENTER_WORKFLOW_ACTIONS.length;
  const journeyCount = WORKFLOW_MINING_JOURNEYS.length;

  return (
    <main className="workflow-builder-page" aria-label="Workflows">
      <header className="workflow-builder-page__header">
        <div className="workflow-builder-page__title-row">
          <GraphicIconBadge iconKey="journey" accent="brand" size="md" />
          <div>
            <h1>Workflows</h1>
            <p>Operational command-center actions, journey templates, and automation launch points.</p>
          </div>
        </div>
        <div className="workflow-builder-page__actions">
          <Link to={CANONICAL_ROUTES.workflowMining}>Workflow mining</Link>
          <Link to={CANONICAL_ROUTES.protocols}>Protocols</Link>
          <Link to={CANONICAL_ROUTES.knowledgeHub}>Knowledge hub</Link>
          <Link to={CANONICAL_ROUTES.operations}>Operations hub</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Workflow builder source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details="Demo operational workflow catalog from command-center actions with mining journey templates for protocol and triage flows."
      />

      <div className="workflow-builder-page__metrics" role="group" aria-label="Workflow builder summary metrics">
        <MetricCard label="Actions" value={String(actionCount)} hint="Command-center workflows" tone="neutral" />
        <MetricCard label="Journeys" value={String(journeyCount)} hint="Mining templates" tone="neutral" />
        <MetricCard label="Critical" value={String(COMMAND_CENTER_WORKFLOW_ACTIONS.filter((a) => a.tone === 'critical').length)} hint="Priority actions" tone="critical" />
        <MetricCard label="Avg deadline" value="5m" hint="Default SLA window" tone="warning" />
      </div>

      <div className="workflow-builder-page__charts">
        <VisualizationPanel title="Action priority" description="Ranked operational workflow priority from command center." badge="Priority">
          <CategoryBarChart
            data={priorityChart}
            title="Action priority"
            color="var(--app-chart-1)"
            emptyMessage="Priority chart appears when workflow actions are registered."
          />
        </VisualizationPanel>
      </div>

      <section className="workflow-builder-page__panel" aria-label="Operational workflow actions">
        <h2>Operational workflow actions</h2>
        <div className="workflow-builder-page__table" role="table">
          <div className="workflow-builder-page__table-head" role="row">
            <span role="columnheader">Action</span>
            <span role="columnheader">Owner</span>
            <span role="columnheader">Deadline</span>
            <span role="columnheader">Next step</span>
          </div>
          {COMMAND_CENTER_WORKFLOW_ACTIONS.map((action) => (
            <div key={action.id} className="workflow-builder-page__table-row" role="row">
              <span role="cell">
                <Link to={action.route}>{action.label}</Link>
                <span className={`workflow-builder-page__pill workflow-builder-page__pill--${WORKFLOW_TONE_CLASS[action.tone] || 'neutral'}`}>
                  P{action.priority}
                </span>
              </span>
              <span role="cell">{action.owner}</span>
              <span role="cell">{action.defaultDeadlineMinutes ? `${action.defaultDeadlineMinutes}m` : '—'}</span>
              <span role="cell">{action.nextAction}</span>
            </div>
          ))}
        </div>
      </section>

      {WORKFLOW_MINING_JOURNEYS.map((journey) => (
        <section key={journey.id} className="workflow-builder-page__panel" aria-label={journey.title}>
          <div className="workflow-builder-page__panel-head">
            <div>
              <h2>{journey.title}</h2>
              <p>
                {journey.frequency} occurrences · {journey.completionRate}% completion
              </p>
            </div>
          </div>
          <ol className="workflow-builder-page__steps">
            {journey.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <ul className="workflow-builder-page__recommendations">
            {journey.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

export default WorkflowBuilderPage;