import React, { useMemo } from 'react';
import {
  buildWaitingRoomSafetyEscalationSnapshot,
  hasWaitingRoomSafetyEscalationActivity,
} from '../../services/waitingRoomSafetyEscalationVisibilityModel';
import './WaitingRoomSafetyEscalationStrip.css';

export default function WaitingRoomSafetyEscalationStrip({
  patients = [] as any[],
  workflowLogs = [] as any[],
  staff = [] as any[],
  alerts = [] as any[],
  communicationOverdueMinutes = 30,
  onSelectPatient,
  className = '',
  alwaysShowWhenActive = true,
}) {
  const context = useMemo(
    () => ({
      workflowLogs,
      staff,
      alerts,
      communicationOverdueMinutes,
    }),
    [alerts, communicationOverdueMinutes, staff, workflowLogs],
  );

  const snapshot = useMemo(
    () => buildWaitingRoomSafetyEscalationSnapshot(patients, context),
    [context, patients],
  );

  if (!alwaysShowWhenActive && !snapshot.escalatedPatientCount) {
    return null;
  }
  if (alwaysShowWhenActive && !hasWaitingRoomSafetyEscalationActivity(snapshot)) {
    return null;
  }

  return (
    <section
      className={['waiting-room-safety-escalation-strip', className].filter(Boolean).join(' ')}
      aria-label="Waiting room safety escalation summary"
    >
      <header className="waiting-room-safety-escalation-strip__header">
        <div>
          <p className="waiting-room-safety-escalation-strip__eyebrow">Waiting room safety</p>
          <h3>Safety escalation</h3>
          <p className="waiting-room-safety-escalation-strip__subtitle">
            Waiting patients needing staff re-review — overdue reassessment, abnormal vitals,
            high-risk complaint, long since contact, or worsening symptoms reported.
          </p>
        </div>
      </header>
      <div className="waiting-room-safety-escalation-strip__counts">
        <div className="waiting-room-safety-escalation-strip__count" data-tone="warning">
          <strong>{snapshot.overdueReassessmentCount}</strong>
          <span>Overdue reassessment</span>
        </div>
        <div className="waiting-room-safety-escalation-strip__count" data-tone="critical">
          <strong>{snapshot.abnormalVitalsCount}</strong>
          <span>Abnormal vitals</span>
        </div>
        <div className="waiting-room-safety-escalation-strip__count" data-tone="warning">
          <strong>{snapshot.highRiskComplaintCount}</strong>
          <span>High-risk complaint</span>
        </div>
        <div className="waiting-room-safety-escalation-strip__count" data-tone="watch">
          <strong>{snapshot.longSinceContactCount}</strong>
          <span>Long since contact</span>
        </div>
        <div className="waiting-room-safety-escalation-strip__count" data-tone="critical">
          <strong>{snapshot.worseningSymptomsCount}</strong>
          <span>Worsening symptoms</span>
        </div>
      </div>
      {snapshot.previewRows.length ? (
        <ul className="waiting-room-safety-escalation-strip__list">
          {snapshot.previewRows.map((row) => (
            <li key={row.patientId}>
              <button
                type="button"
                className="waiting-room-safety-escalation-strip__item"
                data-tone={row.tone}
                onClick={() => onSelectPatient?.(row.patientId)}
                disabled={!onSelectPatient}
              >
                <span>
                  <strong>{row.displayName}</strong>
                  <small>{row.detail}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
