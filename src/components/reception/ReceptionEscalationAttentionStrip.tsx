import React, { useMemo } from 'react';
import { buildReceptionEscalationAttentionSnapshot } from '../../services/receptionEscalationWorkflow';
import type { Alert } from '../../types/emergency';
import './ReceptionEscalationAttentionStrip.css';

function formatTime(timestamp: string | null | undefined) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(timestamp);
  }
}

type ReceptionEscalationAttentionStripProps = {
  alerts?: Alert[];
  roleId?: string | null;
  onSelectPatient?: (patientId: string) => void;
  className?: string;
};

export default function ReceptionEscalationAttentionStrip({
  alerts = [],
  roleId = null,
  onSelectPatient,
  className = '',
}: ReceptionEscalationAttentionStripProps) {
  const snapshot = useMemo(
    () => buildReceptionEscalationAttentionSnapshot(alerts, { roleId, limit: 4 }),
    [alerts, roleId],
  );

  if (!snapshot.rows.length) return null;

  return (
    <section
      className={['reception-escalation-attention-strip', className].filter(Boolean).join(' ')}
      aria-label="Reception escalation attention"
    >
      <header className="reception-escalation-attention-strip__header">
        <p className="reception-escalation-attention-strip__eyebrow">Front desk escalation</p>
        <h3>Reception escalations need response</h3>
        <p className="reception-escalation-attention-strip__subtitle">
          {snapshot.summary.activeCount} active · {snapshot.summary.criticalCount} critical · triage{' '}
          {snapshot.summary.triageCount} · charge {snapshot.summary.chargeCount}
        </p>
      </header>
      <ul className="reception-escalation-attention-strip__list">
        {snapshot.previewRows.map((row) => (
          <li key={row.alertId}>
            <button
              type="button"
              className="reception-escalation-attention-strip__item"
              data-severity={row.severity}
              onClick={() => row.patientId && onSelectPatient?.(row.patientId)}
              disabled={!row.patientId || !onSelectPatient}
            >
              <span className="reception-escalation-attention-strip__title">{row.title}</span>
              <span className="reception-escalation-attention-strip__message">{row.message}</span>
              <span className="reception-escalation-attention-strip__meta">
                {row.reasonLabel || 'Escalation'} · {row.targetsLabel} · {formatTime(row.createdAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
