import React, { useMemo } from 'react';
import { summarizeReceptionEscalationBoard } from '../../services/receptionEscalationWorkflow';
import './ReceptionEscalationStrip.css';

export default function ReceptionEscalationStrip({ alerts = [] as any[], className = '' }) {
  const summary = useMemo(() => summarizeReceptionEscalationBoard(alerts), [alerts]);

  if (!summary.activeCount) return null;

  return (
    <section
      className={['reception-escalation-strip', className].filter(Boolean).join(' ')}
      aria-label="Reception escalation summary"
    >
      <header className="reception-escalation-strip__header">
        <p className="reception-escalation-strip__eyebrow">Front desk escalation</p>
        <h3>Reception escalations</h3>
        <p className="reception-escalation-strip__subtitle">
          {summary.activeCount} active · {summary.criticalCount} critical · triage {summary.triageCount} · charge{' '}
          {summary.chargeCount}
        </p>
      </header>
      <div className="reception-escalation-strip__counts">
        <div className="reception-escalation-strip__count" data-tone="critical">
          <strong>{summary.criticalCount}</strong>
          <span>Critical</span>
        </div>
        <div className="reception-escalation-strip__count" data-tone="watch">
          <strong>{summary.activeCount}</strong>
          <span>Active</span>
        </div>
      </div>
    </section>
  );
}
