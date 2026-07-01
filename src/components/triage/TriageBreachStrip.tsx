import React, { useMemo } from 'react';
import { buildTriageBreachAttentionSnapshot } from '../../services/triageBreachTimer';
import {
  buildTriageBreachVisibilitySnapshot,
  hasTriageBreachVisibilityActivity,
} from '../../services/triageBreachVisibilityModel';
import type { Patient } from '../../types/emergency';
import TriageBreachBadge from './TriageBreachBadge';
import './TriageBreachBadge.css';

type TriageBreachStripProps = {
  patients?: Patient[];
  settings?: Record<string, unknown> | null;
  onSelectPatient?: (patientId: string) => void;
  className?: string;
  alwaysShowWhenActive?: boolean;
};

export default function TriageBreachStrip({
  patients = [],
  settings = null,
  onSelectPatient,
  className = '',
  alwaysShowWhenActive = true,
}: TriageBreachStripProps) {
  const context = useMemo(() => ({ settings: settings || undefined }), [settings]);

  const visibility = useMemo(
    () => buildTriageBreachVisibilitySnapshot(patients, context),
    [context, patients],
  );

  const snapshot = useMemo(
    () => buildTriageBreachAttentionSnapshot(patients, context),
    [context, patients],
  );

  if (!alwaysShowWhenActive && !snapshot.summary.breachRiskCount && !snapshot.summary.breachedCount) {
    return null;
  }
  if (alwaysShowWhenActive && !hasTriageBreachVisibilityActivity(visibility)) {
    return null;
  }

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
          Door-to-triage elapsed time against site thresholds � {snapshot.summary.breachedCount} breached �{' '}
          {snapshot.summary.breachRiskCount} approaching � {visibility.rapidReviewFlags} rapid-review � target{' '}
          {snapshot.summary.targetMinutes}m
        </p>
      </header>
      <div className="triage-breach-strip__counts">
        <div className="triage-breach-strip__count">
          <strong>{visibility.awaitingTriageCount}</strong>
          <span>Awaiting triage</span>
        </div>
        <div className="triage-breach-strip__count">
          <strong>{visibility.longestUntriagedWaitLabel}</strong>
          <span>Longest untriaged</span>
        </div>
        <div className="triage-breach-strip__count" data-tone="watch">
          <strong>{visibility.approachingBreachCount}</strong>
          <span>Approaching breach</span>
        </div>
        <div className="triage-breach-strip__count" data-tone="critical">
          <strong>{visibility.breachedCount}</strong>
          <span>Breached</span>
        </div>
        <div
          className="triage-breach-strip__count"
          data-tone={visibility.rapidReviewFlags ? 'watch' : undefined}
        >
          <strong>{visibility.rapidReviewFlags}</strong>
          <span>Rapid-review flags</span>
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
