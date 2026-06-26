import React from 'react';
import { resolveQueueReason } from '../../services/queueReasonVisibility';
import './QueueReasonBadge.css';

export default function QueueReasonBadge({
  patient,
  referrals = ([] as any[]),
  staff = ([] as any[]),
  compact = false,
  showAll = false,
}) {
  if (!patient?.id) return null;

  const snapshot = resolveQueueReason(patient, { referrals, staff });
  if (!snapshot) return null;

  const { primaryReason, reasons } = snapshot;

  if (showAll && reasons.length > 1) {
    return (
      <span className="queue-reason-badge-group" aria-label={`Queue reasons: ${snapshot.labels.join(', ')}`}>
        {reasons.map((reason) => (
          <span
            key={reason.id}
            className={[
              'queue-reason-badge',
              `queue-reason-badge--${reason.tone}`,
              compact ? 'queue-reason-badge--compact' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={[reason.label, reason.staffDetail].filter(Boolean).join(' · ')}
          >
            {compact ? reason.shortLabel : reason.label}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      className={[
        'queue-reason-badge',
        `queue-reason-badge--${primaryReason.tone}`,
        compact ? 'queue-reason-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={[
        `Queue: ${primaryReason.label}`,
        primaryReason.staffDetail,
        reasons.length > 1 ? `Also: ${reasons.slice(1).map((reason) => reason.label).join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {compact ? primaryReason.shortLabel : primaryReason.label}
    </span>
  );
}
