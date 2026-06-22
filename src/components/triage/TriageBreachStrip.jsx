import React, { useMemo } from 'react';
import { buildTriageBreachAttentionSnapshot } from '../../services/triageBreachTimer';
import TriageBreachBadge from './TriageBreachBadge';
import './TriageBreachBadge.css';

export default function TriageBreachStrip({
  patients = [],
  settings = null,
  onSelectPatient,
  className = '',
}) {
  const context = useMemo(() => ({ settings: settings || undefined }), [settings]);

  const snapshot = useMemo(
    () => buildTriageBreachAttentionSnapshot(patients, context),
    [context, patients],
  );

  if (!snapshot.summary.breachRiskCount && !snapshot.summary.breachedCount) return null;

  const previewPatients = patients.filter((patient) =>
    snapshot.previewRows.some((row) => row.patientId === patient.id),
  );

  return (
    <section
      className={['triage-breach-strip', className].filter(Boolean).join(' ')}
      aria-label="Triage breach summary"
    >
      <header className="triage-breach-strip__header">
        <p className="triage-breach-strip__eyebrow">Arrival to triage</p>
        <h3>Triage breach timer</h3>
        <p className="triage-breach-strip__subtitle">
          Door-to-triage elapsed time against site thresholds — {snapshot.summary.breachedCount} breached ·{' '}
          {snapshot.summary.breachRiskCount} at risk · target {snapshot.summary.targetMinutes}m
        </p>
      </header>
      <div className="triage-breach-strip__counts">
        <div className="triage-breach-strip__count" data-tone="critical">
          <strong>{snapshot.summary.breachedCount}</strong>
          <span>Breached</span>
        </div>
        <div className="triage-breach-strip__count" data-tone="watch">
          <strong>{snapshot.summary.breachRiskCount}</strong>
          <span>At risk</span>
        </div>
        <div className="triage-breach-strip__count">
          <strong>{snapshot.summary.longestElapsedLabel}</strong>
          <span>Longest wait</span>
        </div>
        <div className="triage-breach-strip__count">
          <strong>{snapshot.summary.awaitingTriageCount}</strong>
          <span>Awaiting triage</span>
        </div>
      </div>
      {previewPatients.length ? (
        <ul className="triage-breach-strip__list">
          {previewPatients.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                className="triage-breach-strip__item"
                onClick={() => onSelectPatient?.(patient.id)}
                disabled={!onSelectPatient}
              >
                <span>
                  {[patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.mrn}
                </span>
                <TriageBreachBadge patient={patient} settings={settings} compact showElapsed />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
