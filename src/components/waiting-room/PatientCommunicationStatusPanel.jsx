import React, { useMemo } from 'react';
import { buildPatientCommunicationStatusBoard } from '../../services/patientCommunicationStatus';
import './PatientCommunicationStatusPanel.css';

function formatCheckpointTime(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export default function PatientCommunicationStatusPanel({
  patients = [],
  workflowLogs = [],
  staff = [],
  referrals = [],
  settings = null,
  className = '',
  title = 'Patient communication status',
  description = 'Internal waiting-room contact tracking — last update, reassessment, vitals, and next checkpoint.',
  onSelectPatient,
  compact = false,
}) {
  const board = useMemo(
    () =>
      buildPatientCommunicationStatusBoard(patients, {
        workflowLogs,
        staff,
        referrals,
        settings,
      }),
    [patients, referrals, settings, staff, workflowLogs],
  );

  if (!board.rows.length) return null;

  return (
    <section
      className={[
        'patient-communication-status-panel',
        compact ? 'patient-communication-status-panel--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={title}
    >
      <header className="patient-communication-status-panel__header">
        <div>
          <p className="patient-communication-status-panel__eyebrow">Internal only</p>
          <h3>{title}</h3>
          <p className="patient-communication-status-panel__description">{description}</p>
        </div>
        <p className="patient-communication-status-panel__summary" role="status">
          {board.summaryLine}
        </p>
      </header>

      <div className="patient-communication-status-panel__table-wrap">
        <table className="patient-communication-status-panel__table">
          <thead>
            <tr>
              <th scope="col">Patient</th>
              <th scope="col">Last update</th>
              <th scope="col">Last reassessment</th>
              <th scope="col">Last vitals</th>
              <th scope="col">Next checkpoint</th>
              <th scope="col">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {board.rows.map((row) => (
              <tr
                key={row.patientId}
                data-tone={row.tone}
                data-overdue={row.communicationOverdue ? 'true' : 'false'}
                className={
                  onSelectPatient ? 'patient-communication-status-panel__row--interactive' : ''
                }
                onClick={onSelectPatient ? () => onSelectPatient(row.patientId) : undefined}
                onKeyDown={
                  onSelectPatient
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectPatient(row.patientId);
                        }
                      }
                    : undefined
                }
                tabIndex={onSelectPatient ? 0 : undefined}
              >
                <th scope="row">{row.displayName}</th>
                <td title={row.lastPatientUpdateAt || undefined}>{row.lastPatientUpdateLabel}</td>
                <td title={row.lastReassessmentAt || undefined}>{row.lastReassessmentLabel}</td>
                <td title={row.lastVitalsAt || undefined}>{row.lastVitalsLabel}</td>
                <td title={row.nextExpectedCheckpointDetail || undefined}>
                  <span className="patient-communication-status-panel__checkpoint">
                    {row.nextExpectedCheckpointLabel}
                  </span>
                  {row.nextExpectedCheckpointAt ? (
                    <small>{formatCheckpointTime(row.nextExpectedCheckpointAt)}</small>
                  ) : null}
                </td>
                <td>
                  {row.communicationOverdue ? (
                    <span className="patient-communication-status-panel__overdue">
                      {row.communicationOverdueLabel || 'Overdue'}
                    </span>
                  ) : (
                    <span className="patient-communication-status-panel__current">Current</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
