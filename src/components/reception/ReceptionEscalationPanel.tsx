import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  buildReceptionEscalationTargetsLabel,
  RECEPTION_ESCALATION_REASONS,
  resolveReceptionEscalationReason,
  selectReceptionEscalationPatientOptions,
} from '../../services/receptionEscalationWorkflow';
import { RECEPTION_COPY } from './receptionCopy';
import './ReceptionEscalationPanel.css';

export default function ReceptionEscalationPanel({
  open = false,
  patients = [] as any[],
  defaultPatientId = null,
  initialReasonId = null,
  actorStaffId = null,
  actorName = 'Reception',
  onClose,
  onSubmit,
}) {
  const [reasonId, setReasonId] = useState<any>(null);
  const [patientId, setPatientId] = useState(defaultPatientId || '');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastConfirmation, setLastConfirmation] = useState<any>(null);

  const patientOptions = useMemo(
    () => selectReceptionEscalationPatientOptions(patients),
    [patients],
  );

  const selectedReason = resolveReceptionEscalationReason(reasonId);

  useEffect(() => {
    if (open && initialReasonId) {
      setReasonId(initialReasonId);
      setLastConfirmation(null);
    }
  }, [open, initialReasonId]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!reasonId || submitting) return;

    setSubmitting(true);
    try {
      const record = await onSubmit?.({
        reasonId,
        patientId: patientId || null,
        detail: detail.trim(),
        actorStaffId,
        actorName,
      });

      if (!record) {
        toast.error(RECEPTION_COPY.escalation.submitError);
        return;
      }

      const confirmation = {
        reasonLabel: record.reasonLabel,
        targetsLabel: buildReceptionEscalationTargetsLabel(record.notifyTargets),
      };
      setLastConfirmation(confirmation);
      toast.success(RECEPTION_COPY.escalation.submitSuccess, {
        description: `${confirmation.reasonLabel} · ${confirmation.targetsLabel}`,
      });
      setReasonId(null);
      setDetail('');
      setPatientId(defaultPatientId || '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reception-escalation-panel" role="dialog" aria-modal="true" aria-labelledby="reception-escalation-title">
      <button
        type="button"
        className="reception-escalation-panel__backdrop"
        aria-label="Close escalation panel"
        onClick={onClose}
      />
      <section className="reception-escalation-panel__sheet">
        <header className="reception-escalation-panel__header">
          <div>
            <p className="reception-escalation-panel__eyebrow">{RECEPTION_COPY.escalation.eyebrow}</p>
            <h2 id="reception-escalation-title">{RECEPTION_COPY.escalation.title}</h2>
            <p>{RECEPTION_COPY.escalation.description}</p>
          </div>
          <button type="button" className="reception-escalation-panel__close" onClick={onClose}>
            Close
          </button>
        </header>

        {lastConfirmation ? (
          <div className="reception-escalation-panel__confirmation" role="status">
            <strong>{RECEPTION_COPY.escalation.confirmationTitle}</strong>
            <p>
              {lastConfirmation.reasonLabel} · {lastConfirmation.targetsLabel}
            </p>
            <p>{RECEPTION_COPY.escalation.confirmationBody}</p>
            <button type="button" onClick={() => setLastConfirmation(null)}>
              {RECEPTION_COPY.escalation.flagAnother}
            </button>
          </div>
        ) : (
          <form className="reception-escalation-panel__form" onSubmit={handleSubmit}>
            <fieldset className="reception-escalation-panel__reasons">
              <legend>{RECEPTION_COPY.escalation.reasonLegend}</legend>
              {RECEPTION_ESCALATION_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className={[
                    'reception-escalation-panel__reason',
                    reasonId === reason.id ? 'reception-escalation-panel__reason--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <input
                    type="radio"
                    name="reception-escalation-reason"
                    value={reason.id}
                    checked={reasonId === reason.id}
                    onChange={() => setReasonId(reason.id)}
                  />
                  <span>
                    <strong>{reason.label}</strong>
                    <small>{reason.description}</small>
                    <em>{buildReceptionEscalationTargetsLabel(reason.notifyTargets)}</em>
                  </span>
                </label>
              ))}
            </fieldset>

            <label className="reception-escalation-panel__field">
              <span>{RECEPTION_COPY.escalation.patientLabel}</span>
              <select
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                aria-required={selectedReason?.recommendPatient ? 'true' : 'false'}
              >
                <option value="">{RECEPTION_COPY.escalation.noPatientLinked}</option>
                {patientOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="reception-escalation-panel__field">
              <span>{RECEPTION_COPY.escalation.detailLabel}</span>
              <textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                placeholder={RECEPTION_COPY.escalation.detailPlaceholder}
                rows={3}
              />
            </label>

            <div className="reception-escalation-panel__actions">
              <button type="button" className="reception-escalation-panel__secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="reception-escalation-panel__primary"
                disabled={!reasonId || submitting}
              >
                {submitting ? RECEPTION_COPY.escalation.submitting : RECEPTION_COPY.escalation.submit}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
