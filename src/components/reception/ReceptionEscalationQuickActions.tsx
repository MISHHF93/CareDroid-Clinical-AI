import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  RECEPTION_ESCALATION_REASONS,
  resolveReceptionEscalationReason,
} from '../../services/receptionEscalationWorkflow';
import { RECEPTION_COPY } from './receptionCopy';
import './ReceptionEscalationQuickActions.css';

export default function ReceptionEscalationQuickActions({
  defaultPatientId = null,
  actorStaffId = null,
  actorName = 'Reception',
  disabled = false,
  onSubmit,
  onOpenDetail,
  className = '',
}) {
  const [pendingReasonId, setPendingReasonId] = useState<any>(null);

  const handleQuickFlag = async (reasonId) => {
    if (disabled || pendingReasonId) return;

    const reason = resolveReceptionEscalationReason(reasonId);
    if (!reason) return;

    if (reason.recommendPatient && !defaultPatientId) {
      onOpenDetail?.(reasonId);
      return;
    }

    setPendingReasonId(reasonId);
    try {
      const record = await onSubmit?.({
        reasonId,
        patientId: defaultPatientId,
        detail: reason.description,
        actorStaffId,
        actorName,
      });

      if (!record) {
        toast.error(RECEPTION_COPY.escalation.submitError);
        return;
      }

      toast.success(RECEPTION_COPY.escalation.submitSuccess, {
        description: `${record.reasonLabel} · nurses notified`,
      });
    } finally {
      setPendingReasonId(null);
    }
  };

  return (
    <section
      className={['reception-escalation-quick-actions', className].filter(Boolean).join(' ')}
      aria-label="Quick reception escalation flags"
    >
      <header className="reception-escalation-quick-actions__header">
        <p className="reception-escalation-quick-actions__eyebrow">{RECEPTION_COPY.escalation.eyebrow}</p>
        <h3>Quick flag — stay at desk</h3>
        <p>One-tap signals to triage or charge nurse without leaving reception.</p>
      </header>
      <div className="reception-escalation-quick-actions__grid">
        {RECEPTION_ESCALATION_REASONS.map((reason) => (
          <button
            key={reason.id}
            type="button"
            className={[
              'reception-escalation-quick-actions__button',
              reason.severity === 'Critical'
                ? 'reception-escalation-quick-actions__button--critical'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={disabled || pendingReasonId === reason.id}
            onClick={() => handleQuickFlag(reason.id)}
            title={reason.description}
          >
            <strong>{reason.shortLabel}</strong>
            <small>{reason.notifyTargets.map((t) => (t === 'triage' ? 'Triage' : 'Charge')).join(' · ')}</small>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="reception-escalation-quick-actions__detail"
        disabled={disabled}
        onClick={() => onOpenDetail?.(null)}
      >
        {RECEPTION_COPY.escalation.openAction} with notes
      </button>
    </section>
  );
}
