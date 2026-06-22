import React, { useMemo } from 'react';
import { summarizeTriageBreachBoard } from '../../services/triageBreachTimer';
import './TriageBreachBadge.css';

export default function TriageBreachPanel({ patients = [], settings = null, className = '' }) {
  const summary = useMemo(
    () => summarizeTriageBreachBoard(patients, { settings: settings || undefined }),
    [patients, settings],
  );

  if (!summary.awaitingTriageCount) return null;

  return (
    <section
      className={['triage-breach-panel', className].filter(Boolean).join(' ')}
      aria-label="Triage breach timer"
    >
      <header className="triage-breach-panel__header">
        <p className="triage-breach-panel__eyebrow">Arrival to triage</p>
        <h3>Triage breach timer</h3>
        <p className="triage-breach-panel__subtitle">
          Target {summary.targetMinutes}m · breach risk from {summary.warningMinutes}m
        </p>
      </header>
      <div className="triage-breach-panel__grid">
        <div className="triage-breach-panel__metric" data-tone="neutral">
          <strong>{summary.awaitingTriageCount}</strong>
          <span>Awaiting triage</span>
        </div>
        <div className="triage-breach-panel__metric" data-tone="watch">
          <strong>{summary.breachRiskCount}</strong>
          <span>Breach risk</span>
        </div>
        <div className="triage-breach-panel__metric" data-tone="critical">
          <strong>{summary.breachedCount}</strong>
          <span>Breached</span>
        </div>
        <div className="triage-breach-panel__metric" data-tone={summary.breachedCount ? 'critical' : 'neutral'}>
          <strong>{summary.longestElapsedLabel}</strong>
          <span>Longest elapsed</span>
        </div>
      </div>
    </section>
  );
}
