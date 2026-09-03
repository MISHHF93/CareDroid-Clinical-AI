import React, { useMemo } from 'react';
import {
  buildQueueReasonBoardSummary,
  resolveQueueReason,
} from '../../services/queueReasonVisibility';
import QueueReasonBadge from './QueueReasonBadge';
import './QueueReasonAttentionStrip.css';

export default function QueueReasonAttentionStrip({
  patients = [] as any[],
  referrals = [] as any[],
  staff = [] as any[],
  onSelectPatient,
  className = '',
}) {
  const summary = useMemo(
    () => buildQueueReasonBoardSummary(patients, { referrals, staff }),
    [patients, referrals, staff],
  );

  const previewPatients = useMemo(
    () =>
      patients.filter((patient) => resolveQueueReason(patient, { referrals, staff })).slice(0, 4),
    [patients, referrals, staff],
  );

  if (!summary.statusLines.length) return null;

  return (
    <section
      className={['queue-reason-attention-strip', className].filter(Boolean).join(' ')}
      aria-label="Queue reason visibility"
    >
      <header className="queue-reason-attention-strip__header">
        <div>
          <p className="queue-reason-attention-strip__eyebrow">Queue visibility</p>
          <h3>Why patients are waiting</h3>
          <p className="queue-reason-attention-strip__subtitle">
            Derived from registration, triage, provider, room, result, referral, and reassessment
            state.
          </p>
        </div>
        <div className="queue-reason-attention-strip__counts">
          {summary.statusLines.slice(0, 4).map((line) => (
            <span key={line.id} data-tone={line.tone}>
              <strong>{line.count}</strong>
              <small>{line.shortLabel}</small>
            </span>
          ))}
        </div>
      </header>

      <ul className="queue-reason-attention-strip__list">
        {previewPatients.map((patient) => (
          <li key={patient.id}>
            <button
              type="button"
              className="queue-reason-attention-strip__item"
              onClick={() => onSelectPatient?.(patient.id)}
              disabled={!onSelectPatient}
            >
              <span>
                {[patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.mrn}
              </span>
              <QueueReasonBadge
                patient={patient}
                referrals={referrals}
                staff={staff}
                compact
                showAll
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
