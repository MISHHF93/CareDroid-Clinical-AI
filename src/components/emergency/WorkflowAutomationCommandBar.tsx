import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Workflow } from 'lucide-react';
import useUnifiedWorkflowAutomation from '../../hooks/useUnifiedWorkflowAutomation';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useUser } from '../../contexts/UserContext';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { UNIFIED_WORKFLOW_SAFETY_STATEMENT } from '../../config/unifiedWorkflowAutomationModel';
import { resolveOperationalActorId } from './operationalCommandBarUtils';
import '../../styles/operational-command-bar-focus.css';
import './workflow-automation-command-bar.css';

function WorkflowAutomationCommandBar() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { user } = useUser();
  const workflow = useUnifiedWorkflowAutomation({ realtime: true });
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const handleApprove = useCallback(
    (itemId: string) => {
      void workflow.reviewItem(itemId, 'approve');
    },
    [workflow],
  );
  const handleAcknowledge = useCallback(
    (itemId: string) => {
      workflow.acknowledgeItem(itemId, resolveOperationalActorId(user));
    },
    [workflow, user],
  );

  if (!surfaces.emergencyRoutes.showWorkflowAutomationBar) {
    return null;
  }

  const { pendingItems, pendingCount, criticalCount, clicksSavedEstimate } = workflow;
  if (!pendingCount) {
    return null;
  }

  const tone = criticalCount > 0 ? 'critical' : 'active';

  return (
    <section
      className={`workflow-automation-command-bar workflow-automation-command-bar--${tone}`}
      aria-label="Unified workflow automation queue"
    >
      <div className="workflow-automation-command-bar__identity">
        <Workflow size={16} aria-hidden="true" />
        <strong>Workflow automation</strong>
        <span>{pendingCount} awaiting review</span>
        {criticalCount > 0 ? (
          <span className="workflow-automation-command-bar__critical">{criticalCount} critical</span>
        ) : null}
        {clicksSavedEstimate > 0 ? (
          <span className="workflow-automation-command-bar__metric">
            ~{clicksSavedEstimate} clicks saved when approved
          </span>
        ) : null}
      </div>

      <p className="workflow-automation-command-bar__safety" role="note">
        {UNIFIED_WORKFLOW_SAFETY_STATEMENT.statement}
      </p>

      <ol className="workflow-automation-command-bar__queue">
        {pendingItems.slice(0, 3).map((item) => (
          <li
            key={item.id}
            className={`workflow-automation-command-bar__item${
              item.priority === 'critical' ? ' workflow-automation-command-bar__item--critical' : ''
            }`}
          >
            <div className="workflow-automation-command-bar__main">
              <span className="workflow-automation-command-bar__title">{item.title}</span>
              <span className="workflow-automation-command-bar__meta">
                {item.domain.replace(/_/g, ' ')} · {item.ownerRole}
                {item.patientName ? ` · ${item.patientName}` : ''}
              </span>
            </div>
            <div className="workflow-automation-command-bar__actions">
              {item.patientId ? (
                <button
                  type="button"
                  className="workflow-automation-command-bar__btn"
                  aria-label={`Open patient ${item.patientName || item.patientId}`}
                  onClick={() => selectPatient(item.patientId!)}
                >
                  Patient
                </button>
              ) : null}
              {item.route ? (
                <Link
                  to={item.route}
                  className="workflow-automation-command-bar__btn"
                  aria-label={`Open workflow for ${item.title}`}
                >
                  Open
                </Link>
              ) : null}
              {item.oneClickAction === 'approve' ? (
                <button
                  type="button"
                  className="workflow-automation-command-bar__btn workflow-automation-command-bar__btn--primary"
                  aria-label={`Approve ${item.title}`}
                  onClick={() => handleApprove(item.id)}
                >
                  Approve
                </button>
              ) : null}
              {item.oneClickAction === 'acknowledge' ? (
                <button
                  type="button"
                  className="workflow-automation-command-bar__btn workflow-automation-command-bar__btn--primary"
                  aria-label={`Acknowledge ${item.title}`}
                  onClick={() => handleAcknowledge(item.id)}
                >
                  Acknowledge
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="workflow-automation-command-bar__footer">
        <Link to={CANONICAL_ROUTES.emergencyCommandCenter} className="workflow-automation-command-bar__btn">
          Review all automations
        </Link>
      </div>
    </section>
  );
}

export default memo(WorkflowAutomationCommandBar);