import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useUnifiedWorkflowAutomation from '../../hooks/useUnifiedWorkflowAutomation';
import type { WorkflowAutomationItem } from '../../config/unifiedWorkflowAutomationModel';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useUser } from '../../contexts/UserContext';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';
import { VisualizationPanel } from '../dashboard/DashboardVisualizations';
import { CategoryBarChart, DistributionDonutChart } from '../dashboard/DashboardCharts';
import { buildAutomationStatusChart } from '../../utils/administrativeAutomationChartModel';
import { AiTruthLabel } from '../ai/AiTruthLabel';
import './administrative-automation-review.css';

type AiDecisionPayload = Readonly<{
  nodeId?: string;
  generatedAt?: string;
  intent?: string;
  triage?: Readonly<{ data?: Readonly<Record<string, unknown>>; redFlags?: readonly string[] }>;
  intake?: Readonly<{ data?: Readonly<Record<string, unknown>> }>;
  critical?: Readonly<{ data?: Readonly<Record<string, unknown>>; redFlags?: readonly string[] }>;
  summary?: Readonly<{ data?: Readonly<Record<string, unknown>> }>;
  data?: Readonly<Record<string, unknown>>;
  redFlags?: readonly string[];
  requiresClinicianReview?: boolean;
}>;

const DOMAIN_LABELS: Record<WorkflowAutomationItem['domain'], string> = {
  reception: 'Reception',
  intake: 'Intake',
  triage: 'Triage',
  patient_routing: 'Patient routing',
  notifications: 'Notifications',
  documentation: 'Documentation',
  handoffs: 'Handoffs',
  staff_assignments: 'Staff assignments',
  analytics: 'Analytics',
  reporting: 'Reporting',
  ai_recommendations: 'AI recommendations',
};

function readAiDecision(
  task: { proposedPayload?: Readonly<Record<string, unknown>> } | undefined,
): AiDecisionPayload | null {
  const decision = task?.proposedPayload?.aiDecision;
  if (!decision || typeof decision !== 'object') return null;
  return decision as AiDecisionPayload;
}

function readField(data: Readonly<Record<string, unknown>> | undefined, keys: string[]): string {
  if (!data) return '';
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return '';
}

function AiDecisionBlock({ decision }: { decision: AiDecisionPayload }) {
  const triageLevel =
    readField(decision.triage?.data, ['recommendedTriageLevel', 'triageLevel']) ||
    readField(decision.data, ['riskLevel', 'recommendedTriageLevel']);
  const severity = readField(decision.critical?.data, ['severity', 'riskLevel']);
  const missingFields = decision.intake?.data?.missingFields;
  const summaryText = readField(decision.summary?.data, ['summary', 'headline', 'narrative']);
  const redFlags = [
    ...(decision.redFlags || []),
    ...(decision.triage?.redFlags || []),
    ...(decision.critical?.redFlags || []),
  ].filter((flag, index, list) => flag && list.indexOf(flag) === index);

  const hasDetails =
    Boolean(triageLevel) ||
    Boolean(severity) ||
    Boolean(summaryText) ||
    redFlags.length > 0 ||
    (Array.isArray(missingFields) && missingFields.length > 0);

  if (!hasDetails) return null;

  return (
    <div className="automation-review__ai-decision" role="region" aria-label="AI decision support">
      <div className="automation-review__ai-decision-header">
        <span>CareDroid AI advisory</span>
        {decision.requiresClinicianReview ? (
          <span className="automation-review__ai-badge">Clinician review required</span>
        ) : null}
      </div>
      {/*
       * Traced the full call chain (not just this file) before labeling:
       * this payload comes from patientJourneyAiDecisionService, which calls
       * invokeUnifiedAiStructuredByIntent -> POST /api/ai/node ->
       * backend ai.service.ts's runCareDroidAINode -> runCareDroidAI()
       * (lib/ai/careDroidAI.ts). That shared function's handlers for all 4
       * intents used here (critical_alert_assessment, patient_intake_assist,
       * triage_recommendation, patient_summary) are pure keyword/threshold
       * logic with zero model or network call, and its own success-path
       * response sets provenance.responseSource: 'DETERMINISTIC_RULE' — the
       * exact category this same AiTruthLabel.tsx file always maps to
       * 'Manual' everywhere else. If the backend call fails,
       * transportCareDroidAINode (careDroidAiApi.ts) falls back to calling
       * that SAME runCareDroidAI() locally, so there is no code path here
       * that is actually model-backed. A prior version of this comment
       * claimed this was "architecturally a genuine Live AI surface" based
       * on the request reaching a real gateway — that was true but not
       * sufficient: the gateway's own handler is rule-based, so "Live" was
       * an overclaim regardless of per-response success/failure.
       */}
      <AiTruthLabel
        state="Manual"
        sourceContext="Patient Journey AI decision service — CareDroid AI Chief gateway routes to deterministic rule handlers (keyword/threshold logic), not a trained model"
        reviewRequired={decision.requiresClinicianReview ?? true}
        compact
      />
      <dl className="automation-review__ai-fields">
        {triageLevel ? (
          <>
            <dt>Recommended triage</dt>
            <dd>{triageLevel}</dd>
          </>
        ) : null}
        {severity ? (
          <>
            <dt>Critical severity</dt>
            <dd>{severity}</dd>
          </>
        ) : null}
        {Array.isArray(missingFields) && missingFields.length > 0 ? (
          <>
            <dt>Registration gaps</dt>
            <dd>{missingFields.slice(0, 4).join(', ')}</dd>
          </>
        ) : null}
        {redFlags.length > 0 ? (
          <>
            <dt>Red flags</dt>
            <dd>{redFlags.slice(0, 5).join(' · ')}</dd>
          </>
        ) : null}
        {summaryText ? (
          <>
            <dt>Summary</dt>
            <dd>{summaryText}</dd>
          </>
        ) : null}
      </dl>
      {decision.intent ? (
        <p className="automation-review__ai-intent">Intent: {decision.intent.replace(/_/g, ' ')}</p>
      ) : null}
    </div>
  );
}

function WorkflowRow({
  item,
  aiDecision,
  onApprove,
  onAcknowledge,
  onDismiss,
  onOverride,
}: {
  item: WorkflowAutomationItem;
  aiDecision: AiDecisionPayload | null;
  onApprove: (itemId: string) => void;
  onAcknowledge: (itemId: string) => void;
  onDismiss: (itemId: string) => void;
  onOverride: (itemId: string) => void;
}) {
  return (
    <li className={`automation-review__row automation-review__row--${item.priority}`}>
      <div className="automation-review__row-main">
        <div className="automation-review__row-header">
          <strong>{item.title}</strong>
          <span className="automation-review__category">{DOMAIN_LABELS[item.domain]}</span>
        </div>
        <p>{item.summary}</p>
        {aiDecision ? <AiDecisionBlock decision={aiDecision} /> : null}
        <p className="automation-review__action">
          <span>Proposed:</span> {item.proposedAction}
        </p>
        <div className="automation-review__meta">
          <span>Owner: {item.ownerRole}</span>
          <span>{item.source.replace(/_/g, ' ')} · review required</span>
        </div>
      </div>
      <div className="automation-review__actions">
        {item.route ? (
          <Link to={item.route} className="automation-review__btn automation-review__btn--ghost">
            Open
          </Link>
        ) : null}
        {item.oneClickAction === 'approve' ? (
          <button
            type="button"
            className="automation-review__btn automation-review__btn--approve"
            onClick={() => onApprove(item.id)}
          >
            Approve
          </button>
        ) : null}
        {item.oneClickAction === 'acknowledge' ? (
          <button
            type="button"
            className="automation-review__btn automation-review__btn--approve"
            onClick={() => onAcknowledge(item.id)}
          >
            Acknowledge
          </button>
        ) : null}
        {item.linkedTaskId ? (
          <>
            <button
              type="button"
              className="automation-review__btn automation-review__btn--ghost"
              aria-label={`Override ${item.title}`}
              onClick={() => onOverride(item.id)}
            >
              Override
            </button>
            <button
              type="button"
              className="automation-review__btn automation-review__btn--dismiss"
              aria-label={`Dismiss ${item.title}`}
              onClick={() => onDismiss(item.id)}
            >
              Dismiss
            </button>
          </>
        ) : null}
      </div>
    </li>
  );
}

export function AdministrativeAutomationReviewPanel() {
  const workflow = useUnifiedWorkflowAutomation({ realtime: true });
  const adminQueue = useEmergencyStore((state) => state.administrativeAutomationQueue);
  const { user } = useUser();

  const statusChart = useMemo(() => {
    const items = workflow.items || [];
    // WorkflowAutomationItemStatus (workflow.items' own status type) has no
    // 'overridden' member at all -- it can only ever be pending_review/
    // active/acknowledged/executed. The real override count lives on
    // adminQueue's AdministrativeAutomationTask.status instead (set by the
    // Override button above, which always requires a reason). This chart
    // was silently reporting 0 regardless of how many overrides actually
    // happened, rather than reading the count that was already in scope.
    const metrics = {
      pendingReview: workflow.pendingCount,
      executedToday: items.filter((item) => item.status === 'executed').length,
      overridden: adminQueue.filter((task) => task.status === 'overridden').length,
    };
    return buildAutomationStatusChart(metrics);
  }, [workflow.items, workflow.pendingCount, adminQueue]);

  const categoryChart = useMemo(
    () =>
      Object.entries(workflow.snapshot?.metrics?.byDomain || {})
        .filter(([, count]) => count > 0)
        .map(([domain, count]) => ({
          name: DOMAIN_LABELS[domain as WorkflowAutomationItem['domain']] || domain,
          value: count,
        }))
        .sort((left, right) => right.value - left.value),
    [workflow.snapshot.metrics.byDomain],
  );

  const linkedTaskById = useMemo(
    () => new Map(adminQueue.map((task) => [task.id, task])),
    [adminQueue],
  );

  const handleApprove = (itemId: string) => {
    void workflow.reviewItem(itemId, 'approve');
  };

  const handleDismiss = (itemId: string) => {
    void workflow.reviewItem(itemId, 'dismiss');
  };

  const handleOverride = (itemId: string) => {
    void workflow.reviewItem(itemId, 'override', {
      overrideReason: 'Clinician chose manual workflow instead of automated action.',
    });
  };

  const handleAcknowledge = (itemId: string) => {
    const actorId = user?.id || user?.email || user?.name || 'clinical-user';
    workflow.acknowledgeItem(itemId, actorId);
  };

  return (
    <div className="automation-review">
      <header className="automation-review__header">
        <div className="automation-review__header-lead">
          <GraphicIconBadge iconKey="shield-check" accent="brand" size="md" />
          <div>
            <strong>Unified workflow automation</strong>
            <p className="automation-review__lead">
              {workflow.pendingCount} pending review · reception, intake, triage, routing,
              notifications, documentation, handoffs, staff assignments, analytics, reporting, and
              AI recommendations
            </p>
          </div>
        </div>
      </header>

      <div className="automation-review__charts dashboard-visual-grid">
        <VisualizationPanel
          title="Queue status"
          description="Pending review versus executed workflow automations."
          badge="Status"
        >
          <DistributionDonutChart
            data={statusChart}
            title="Workflow automation status"
            emptyMessage="No workflow automation activity yet."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="By domain"
          description="Automation workload grouped by hospital workflow domain."
          badge="Domains"
        >
          <CategoryBarChart
            data={categoryChart}
            title="Workflow domains"
            xKey="name"
            color="var(--app-chart-5)"
            emptyMessage="No domain workload to chart."
          />
        </VisualizationPanel>
      </div>

      {workflow.pendingItems.length === 0 ? (
        <p className="automation-review__empty">
          No workflow automations awaiting clinician review.
        </p>
      ) : (
        <ul className="automation-review__list">
          {workflow.pendingItems.slice(0, 8).map((item) => (
            <WorkflowRow
              key={item.id}
              item={item}
              aiDecision={readAiDecision(
                item.linkedTaskId ? linkedTaskById.get(item.linkedTaskId) : undefined,
              )}
              onApprove={handleApprove}
              onAcknowledge={handleAcknowledge}
              onDismiss={handleDismiss}
              onOverride={handleOverride}
            />
          ))}
        </ul>
      )}

      <p className="automation-review__safety" role="note">
        {workflow.snapshot.safetyStatement}
      </p>
    </div>
  );
}

export default AdministrativeAutomationReviewPanel;
