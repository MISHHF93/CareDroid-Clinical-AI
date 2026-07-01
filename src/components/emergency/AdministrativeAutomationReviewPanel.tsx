import { Link } from 'react-router-dom';
import useAdministrativeAutomations from '../../hooks/useAdministrativeAutomations';
import type { AdministrativeAutomationTask } from '../../types/administrativeAutomation';
import './administrative-automation-review.css';

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
  return (
    <li className={`automation-review__row automation-review__row--${task.priority}`}>
      <div className="automation-review__row-main">
        <div className="automation-review__row-header">
          <strong>{task.title}</strong>
          <span className="automation-review__category">{CATEGORY_LABELS[task.category]}</span>
        </div>
        <p>{task.summary}</p>
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