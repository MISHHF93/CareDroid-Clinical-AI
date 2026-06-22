import React, { useMemo } from 'react';
import useTriageScreen from '../../hooks/useTriageScreen';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { enterWaitingQueue } from '../../services/queueAssignment';
import { buildClientTriageAssist } from '../../services/triageAssist';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState, Priority } from '../../types/emergency';
import './AiTriageAssistPanel.css';

function priorityLabel(priority) {
  return priority || Priority.P3;
}

export default function AiTriageAssistPanel({
  patient,
  compact = false,
  onEdit,
  onDismissed,
  onAccepted,
}) {
  const triage = useTriageScreen();
  const emergencyRole = useEmergencyRolePermissions();
  const store = useEmergencyStore();
  const patients = useEmergencyStore((state) => state.patients);
  const canReviewTriage = triage.showAiTriageAssist;

  const resolvedAssist = useMemo(() => {
    if (!patient || patient.state !== PatientState.Triage || !canReviewTriage) return null;
    if (patient.triageAssist && !patient.triageAssist.dismissedAt) return patient.triageAssist;
    return buildClientTriageAssist(patient, patients);
  }, [canReviewTriage, patient, patients]);

  const visible = Boolean(resolvedAssist && !resolvedAssist.dismissedAt);

  if (!visible || !resolvedAssist) return null;

  const assist = resolvedAssist;

  const handleAccept = () => {
    store.updatePatient(patient.id, {
      priority: assist.suggestedPriority,
      triageAssist: {
        ...assist,
        acceptedAt: new Date().toISOString(),
      },
    });
    const result = enterWaitingQueue(store, {
      patientId: patient.id,
      actorName: emergencyRole.roleLabel,
      note: `Triage assist accepted (${assist.suggestedPriority}) — moved to waiting queue.`,
    });
    store.recordWorkflowAction({
      type: 'journey_state_changed',
      summary: `AI triage suggestion accepted for ${patient.firstName} ${patient.lastName}.`,
      patientId: patient.id,
      actorName: emergencyRole.roleLabel,
      source: 'ai-triage-assist',
      metadata: {
        suggestedPriority: assist.suggestedPriority,
        suggestedQueue: assist.suggestedQueue,
        ruleTriggered: assist.ruleTriggered,
        accepted: true,
        queueResult: result.ok ? 'waiting' : result.reason,
      },
    });
    onAccepted?.(patient.id, assist);
  };

  const handleDismiss = () => {
    store.updatePatient(patient.id, {
      triageAssist: {
        ...assist,
        dismissedAt: new Date().toISOString(),
      },
    });
    store.recordWorkflowAction({
      type: 'integration_event_received',
      summary: `AI triage suggestion dismissed for ${patient.firstName} ${patient.lastName}.`,
      patientId: patient.id,
      actorName: emergencyRole.roleLabel,
      source: 'ai-triage-assist',
      metadata: {
        dismissed: true,
        suggestedPriority: assist.suggestedPriority,
      },
    });
    onDismissed?.(patient.id);
  };

  const handleEdit = () => {
    store.selectPatient(patient.id);
    onEdit?.(patient.id);
  };

  const handleAskCopilot = () => {
    store.selectPatient(patient.id);
    if (!store.copilotOpen) {
      store.toggleCopilot();
    }
    window.dispatchEvent(
      new CustomEvent('ed:copilot-prefill', {
        detail: {
          patientId: patient.id,
          message: `Review triage assist for ${patient.firstName} ${patient.lastName}: suggested ${assist.suggestedPriority} (${assist.suggestedQueue}). ${assist.rationale.join(' ')}`,
        },
      }),
    );
  };

  return (
    <section
      className={[
        'ai-triage-assist',
        compact ? 'ai-triage-assist--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="AI triage assist suggestion"
      data-testid="ai-triage-assist-panel"
    >
      <header className="ai-triage-assist__header">
        <div>
          <p className="ai-triage-assist__eyebrow">AI triage assist</p>
          <h3 className="ai-triage-assist__title">
            Suggested {priorityLabel(assist.suggestedPriority)} · {assist.suggestedQueue}
          </h3>
        </div>
        <span className="ai-triage-assist__confidence">{assist.confidence} confidence</span>
      </header>

      <ul className="ai-triage-assist__rationale">
        {assist.rationale.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {assist.operationalContext?.queuePressure ? (
        <p className="ai-triage-assist__context">
          Queue pressure: {assist.operationalContext.queuePressure}
        </p>
      ) : null}

      <p className="ai-triage-assist__disclaimer">
        {assist.disclaimers?.[0] || 'Human review required. Staff must confirm before clinical actions.'}
      </p>

      <div className="ai-triage-assist__actions">
        <button type="button" className="ai-triage-assist__action ai-triage-assist__action--primary" onClick={handleAccept}>
          Accept suggestion
        </button>
        <button type="button" className="ai-triage-assist__action" onClick={handleEdit}>
          Edit manually
        </button>
        <button type="button" className="ai-triage-assist__action" onClick={handleAskCopilot}>
          Ask Copilot
        </button>
        <button type="button" className="ai-triage-assist__action ai-triage-assist__action--ghost" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </section>
  );
}

export function AiTriageAssistPanelForPatientId({ patientId, ...props }) {
  const patient = useEmergencyStore((state) =>
    state.patients.find((entry) => entry.id === patientId),
  );
  if (!patient || patient.state !== PatientState.Triage) return null;
  return <AiTriageAssistPanel patient={patient} {...props} />;
}
