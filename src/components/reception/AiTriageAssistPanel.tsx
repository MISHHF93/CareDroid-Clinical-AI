import React, { useMemo, useState } from 'react';
import useTriageScreen from '../../hooks/useTriageScreen';
import useReceptionScreen from '../../hooks/useReceptionScreen';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { buildClientTriageAssist } from '../../services/triageAssist';
import {
  acceptTriageAssistSuggestion,
  dismissTriageAssistSuggestion,
  isTriageAssistPendingReview,
  streamingLaneLabel,
} from '../../services/triageAssistSignOff';
import { CARE_STREAMING_LANES } from '../../config/edOperationalStandards';
import { priorityToEsiLabel } from '../../config/edOperationalStandards';
import { useEmergencyStore } from '../../store/emergencyStore';
import { Priority } from '../../types/emergency';
import './AiTriageAssistPanel.css';

const PRIORITY_OPTIONS = [Priority.P1, Priority.P2, Priority.P3, Priority.P4, Priority.P5];

function priorityLabel(priority) {
  return priority || Priority.P3;
}

export default function AiTriageAssistPanel({
  patient,
  compact = false,
  onEdit = (undefined as any),
  onDismissed = (undefined as any),
  onAccepted = (undefined as any),
  allowWaitingReview = true,
}) {
  const triage = useTriageScreen();
  const reception = useReceptionScreen();
  const emergencyRole = useEmergencyRolePermissions();
  const patients = useEmergencyStore((state) => state.patients);
  const canReviewTriage = triage.showAiTriageAssist || reception.showClinicalTriageAssist;

  const [overridePriority, setOverridePriority] = useState('');
  const [overrideLane, setOverrideLane] = useState('');

  const resolvedAssist = useMemo(() => {
    if (!patient || !canReviewTriage) return null;
    if (!isTriageAssistPendingReview(patient) && !allowWaitingReview) return null;
    if (patient.triageAssist && !patient.triageAssist.dismissedAt && !patient.triageAssist.acceptedAt) {
      return patient.triageAssist;
    }
    if (!isTriageAssistPendingReview(patient)) return null;
    return buildClientTriageAssist(patient, patients);
  }, [allowWaitingReview, canReviewTriage, patient, patients]);

  const visible = Boolean(resolvedAssist && isTriageAssistPendingReview(patient));

  if (!visible || !resolvedAssist || !patient) return null;

  const assist = resolvedAssist;
  const lane = overrideLane || assist.suggestedQueue;
  const priority = overridePriority || assist.suggestedPriority;

  // These handlers only need the store's current values/actions at click time
  // — none of them are read during render — so useEmergencyStore.getState()
  // (a plain snapshot, not a subscription) avoids re-rendering this component
  // on every store mutation the way `useEmergencyStore()` (whole-store,
  // no selector) previously did.
  const handleAccept = () => {
    const result = acceptTriageAssistSuggestion(useEmergencyStore.getState(), patient, assist, {
      actorName: emergencyRole.roleLabel,
      override: {
        priority: (overridePriority || undefined) as any,
        streamingLane: overrideLane || undefined,
      },
    });
    onAccepted?.(patient.id, result.accepted);
  };

  const handleDismiss = () => {
    dismissTriageAssistSuggestion(useEmergencyStore.getState(), patient, assist, emergencyRole.roleLabel);
    onDismissed?.(patient.id);
  };

  const handleEdit = () => {
    useEmergencyStore.getState().selectPatient(patient.id);
    onEdit?.(patient.id);
  };

  const handleAskCopilot = () => {
    const store = useEmergencyStore.getState();
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

  const sourceLabel =
    patient.source === 'Self-arrival' ? 'Self-arrival check-in' : assist.source || 'Rules engine';

  return (
    <section
      className={[
        'ai-triage-assist',
        compact ? 'ai-triage-assist--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Triage assist nurse sign-off"
      data-testid="ai-triage-assist-panel"
    >
      <header className="ai-triage-assist__header">
        <div>
          <p className="ai-triage-assist__eyebrow">Nurse triage sign-off · {sourceLabel}</p>
          <h3 className="ai-triage-assist__title">
            Suggested {priorityLabel(priority)} · {streamingLaneLabel(String(lane))}
          </h3>
          <p className="ai-triage-assist__esi">{priorityToEsiLabel(priority)}</p>
        </div>
        <span className="ai-triage-assist__confidence">{assist.confidence} confidence</span>
      </header>

      <div className="ai-triage-assist__overrides">
        <label>
          Confirm or override priority
          <select value={overridePriority} onChange={(event) => setOverridePriority(event.target.value)}>
            <option value="">Use suggestion ({assist.suggestedPriority})</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Confirm or override streaming lane
          <select value={overrideLane} onChange={(event) => setOverrideLane(event.target.value)}>
            <option value="">Use suggestion ({streamingLaneLabel(String(assist.suggestedQueue))})</option>
            {CARE_STREAMING_LANES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
        {assist.disclaimers?.[0] || 'Human review required. Nurse must confirm acuity and streaming before clinical actions.'}
      </p>

      <div className="ai-triage-assist__actions">
        <button type="button" className="ai-triage-assist__action ai-triage-assist__action--primary" onClick={handleAccept}>
          Accept &amp; send to queue
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
  if (!patient || !isTriageAssistPendingReview(patient)) return null;
  return <AiTriageAssistPanel patient={patient} {...props} />;
}