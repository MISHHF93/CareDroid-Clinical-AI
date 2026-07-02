import { Link } from 'react-router-dom';
import useAdministrativeAutomations from '../../hooks/useAdministrativeAutomations';
import type { AdministrativeAutomationTask } from '../../types/administrativeAutomation';
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

function readAiDecision(task: AdministrativeAutomationTask): AiDecisionPayload | null {
  const decision = task.proposedPayload?.aiDecision;
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
  const triageLevel = readField(decision.triage?.data, ['recommendedTriageLevel', 'triageLevel']) ||
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
        <p className="automation-review__ai-intent">
          Intent: {decision.intent.replace(/_/g, ' ')}
        </p>
      ) : null}
    </div>
  );
}

const CATEGORY_LABELS: Record<AdministrativeAutomationTask['category'], string> = {
  patient_routing: 'Patient routing',
  documentation_handoff: 'Documentation handoff',
  ai_patient_summary: 'AI patient summary',
  triage_preparation: 'Triage preparation',
  department_notification: 'Department notification',
  staff_assignment: 'Staff assignment',
  queue_prioritization: 'Queue prioritization',
  escalation_workflow: 'Escalation workflow',
};

function AutomationRow({
  task,
  onApprove,
  onDismiss,
  onOverride,
}: {
  task: AdministrativeAutomationTask;
  onApprove: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
  onOverride: (taskId: string) => void;
}) {
  const aiDecision = readAiDecision(task);

  return (
    <li className={`automation-review__row automation-review__row--${task.priority}`}>
      <div className="automation-review__row-main">
        <div className="automation-review__row-header">
          <strong>{task.title}</strong>
          <span className="automation-review__category">{CATEGORY_LABELS[task.category]}</span>
        </div>
        <p>{task.summary}</p>
        {aiDecision ? <AiDecisionBlock decision={aiDecision} /> : null}
        <p className="automation-review__action">
          <span>Proposed:</span> {task.proposedAction}
        </p>
        <div className="automation-review__meta">
          <span>Owner: {task.ownerRole}</span>
          {task.aiGenerated ? <span>AI-assisted · review required</span> : null}
        </div>
      </div>
      <div className="automation-review__actions">
        {task.route ? (
          <Link to={task.route} className="automation-review__btn automation-review__btn--ghost">
            Open
          </Link>
        ) : null}
        <button
          type="button"
          className="automation-review__btn automation-review__btn--approve"
          onClick={() => onApprove(task.id)}
        >
          Approve
        </button>
        <button
          type="button"
          className="automation-review__btn automation-review__btn--ghost"
          onClick={() => onOverride(task.id)}
        >
          Override
        </button>
        <button
          type="button"
          className="automation-review__btn automation-review__btn--dismiss"
          onClick={() => onDismiss(task.id)}
        >
          Dismiss
        </button>
      </div>
    </li>
  );
}

export function AdministrativeAutomationReviewPanel() {
  const { snapshot, pendingTasks, review } = useAdministrativeAutomations();

  const handleApprove = (taskId: string) => {
    void review({ taskId, decision: 'approve', executeOnApprove: true });
  };

  const handleDismiss = (taskId: string) => {
    void review({ taskId, decision: 'dismiss', executeOnApprove: false });
  };

  const handleOverride = (taskId: string) => {
    void review({
      taskId,
      decision: 'override',
      overrideReason: 'Clinician chose manual workflow instead of automated action.',
      executeOnApprove: false,
    });
  };

  return (
    <div className="automation-review">
      <header className="automation-review__header">
        <div>
          <strong>Administrative automation queue</strong>
          <p className="automation-review__lead">
            {snapshot.metrics.pendingReview} pending review · unified orchestration across routing,
            handoffs, summaries, triage prep, notifications, assignments, queue priority, and escalations
          </p>
        </div>
      </header>

      <div className="automation-review__metrics">
        {Object.entries(snapshot.metrics.byCategory)
          .filter(([, count]) => count > 0)
          .map(([category, count]) => (
            <span key={category}>
              {CATEGORY_LABELS[category as AdministrativeAutomationTask['category']]} {count}
            </span>
          ))}
      </div>

      {pendingTasks.length === 0 ? (
        <p className="automation-review__empty">No administrative automations awaiting clinician review.</p>
      ) : (
        <ul className="automation-review__list">
          {pendingTasks.slice(0, 8).map((task) => (
            <AutomationRow
              key={task.id}
              task={task}
              onApprove={handleApprove}
              onDismiss={handleDismiss}
              onOverride={handleOverride}
            />
          ))}
        </ul>
      )}

      <p className="automation-review__safety" role="note">
        {snapshot.safetyStatement}
      </p>
    </div>
  );
}

export default AdministrativeAutomationReviewPanel;