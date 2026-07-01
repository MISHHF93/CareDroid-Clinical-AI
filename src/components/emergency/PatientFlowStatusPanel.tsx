import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import useContinuousPatientFlow from '../../hooks/useContinuousPatientFlow';
import type { PatientFlowPatientSnapshot } from '../../engine/continuousPatientFlowEngine';
import './patient-flow-status.css';

function bottleneckLabel(status: PatientFlowPatientSnapshot['bottleneckStatus']): string {
  if (status === 'clear') return 'On track';
  if (status === 'watch') return 'Watch';
  if (status === 'congestion') return 'Congestion';
  if (status === 'overload') return 'Overload';
  return 'Handoff delay';
}

type PatientFlowStatusPanelProps = {
  patientId?: string | null;
  variant?: 'card' | 'inline';
  className?: string;
};

export function PatientFlowStatusPanel({
  patientId = null,
  variant = 'card',
  className = '',
}: PatientFlowStatusPanelProps) {
  const { snapshot, patientSnapshot, detections, aiRecommendations } = useContinuousPatientFlow(patientId);

  if (!snapshot) {
    return (
      <div className={`patient-flow-status patient-flow-status--${variant} ${className}`.trim()}>
        <p className="patient-flow-status__empty">Initializing continuous patient flow engine…</p>
      </div>
    );
  }

  if (patientId && patientSnapshot) {
    return (
      <div className={`patient-flow-status patient-flow-status--${variant} ${className}`.trim()}>
        <header className="patient-flow-status__header">
          <strong>{patientSnapshot.workflowStateLabel}</strong>
          <span
            className={`patient-flow-status__badge patient-flow-status__badge--${patientSnapshot.bottleneckStatus}`}
          >
            {bottleneckLabel(patientSnapshot.bottleneckStatus)}
          </span>
        </header>
        <dl className="patient-flow-status__grid">
          <div>
            <dt>Owner</dt>
            <dd>{patientSnapshot.ownerName || patientSnapshot.ownerRole}</dd>
          </div>
          <div>
            <dt>Stage wait</dt>
            <dd>
              {patientSnapshot.stageWaitMinutes}m / {patientSnapshot.targetMinutes}m target
            </dd>
          </div>
          <div>
            <dt>Total wait</dt>
            <dd>{patientSnapshot.waitMinutes}m since arrival</dd>
          </div>
          <div>
            <dt>Next step</dt>
            <dd>{patientSnapshot.predictedNextStep || 'Monitor workflow'}</dd>
          </div>
        </dl>
        {patientSnapshot.aiRecommendation ? (
          <p className="patient-flow-status__recommendation">{patientSnapshot.aiRecommendation}</p>
        ) : null}
        {patientSnapshot.bottleneckReason ? (
          <p className="patient-flow-status__reason">{patientSnapshot.bottleneckReason}</p>
        ) : null}
      </div>
    );
  }

  const topDetections = detections.slice(0, 6);
  const topRecommendations = aiRecommendations.slice(0, 4);

  return (
    <div className={`patient-flow-status patient-flow-status--${variant} ${className}`.trim()}>
      <header className="patient-flow-status__header">
        <div>
          <strong>Continuous patient flow</strong>
          <p className="patient-flow-status__lead">
            {snapshot.metrics.trackedPatients} patients tracked · {snapshot.metrics.activeDetections}{' '}
            active signals
          </p>
        </div>
        <Link to={CANONICAL_ROUTES.emergencyQueues} className="patient-flow-status__link">
          Open queues
        </Link>
      </header>

      <div className="patient-flow-status__metrics">
        <span>{snapshot.metrics.congestedDepartments} congested departments</span>
        <span>{snapshot.metrics.overloadedDepartments} overloaded</span>
        <span>{snapshot.metrics.delayedHandoffs} delayed handoffs</span>
      </div>

      {topDetections.length > 0 ? (
        <ul className="patient-flow-status__list">
          {topDetections.map((detection) => (
            <li key={detection.id} className={`patient-flow-status__row patient-flow-status__row--${detection.severity}`}>
              <div>
                <strong>{detection.title}</strong>
                <p>{detection.message}</p>
                <span>Owner: {detection.ownerRole}</span>
              </div>
              {detection.patientId ? (
                <Link
                  to={`${CANONICAL_ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent(detection.patientId)}`}
                  className="patient-flow-status__link"
                >
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="patient-flow-status__empty">All tracked patients are within stage targets.</p>
      )}

      {topRecommendations.length > 0 ? (
        <div className="patient-flow-status__recommendations">
          <strong>AI operational recommendations</strong>
          <ul>
            {topRecommendations.map((rec) => (
              <li key={rec.id}>
                <span>{rec.action}</span>
                <p>{rec.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default PatientFlowStatusPanel;