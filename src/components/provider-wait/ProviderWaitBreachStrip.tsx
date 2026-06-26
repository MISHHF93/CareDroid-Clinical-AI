import React, { useMemo } from 'react';
import { buildProviderWaitBreachAttentionSnapshot } from '../../services/providerWaitBreachTimer';
import {
  buildProviderWaitVisibilitySnapshot,
  hasProviderWaitVisibilityActivity,
} from '../../services/providerWaitVisibilityModel';
import ProviderWaitBreachBadge from './ProviderWaitBreachBadge';
import './ProviderWaitBreachBadge.css';

export default function ProviderWaitBreachStrip({
  patients = ([] as any[]),
  settings = (null as any),
  onSelectPatient,
  className = '',
  alwaysShowWhenActive = true,
}) {
  const context = useMemo(() => ({ settings: settings || undefined }), [settings]);

  const visibility = useMemo(
    () => buildProviderWaitVisibilitySnapshot(patients, context),
    [context, patients],
  );

  const snapshot = useMemo(
    () => buildProviderWaitBreachAttentionSnapshot(patients, context),
    [context, patients],
  );

  if (!alwaysShowWhenActive && !snapshot.summary.approachingThresholdCount && !snapshot.summary.breachedCount) {
    return null;
  }
  if (alwaysShowWhenActive && !hasProviderWaitVisibilityActivity(visibility)) {
    return null;
  }

  const previewPatients = patients.filter((patient) =>
    snapshot.previewRows.some((row) => row.patientId === patient.id),
  );

  return (
    <section
      className={['provider-wait-breach-strip', className].filter(Boolean).join(' ')}
      aria-label="Provider wait breach summary"
    >
      <header className="provider-wait-breach-strip__header">
        <p className="provider-wait-breach-strip__eyebrow">Triage to provider</p>
        <h3>Provider wait breach timer</h3>
        <p className="provider-wait-breach-strip__subtitle">
          Triage-to-provider elapsed time against CTAS thresholds — {snapshot.summary.breachedCount}{' '}
          breached · {snapshot.summary.approachingThresholdCount} approaching · avg{' '}
          {visibility.averageProviderWaitLabel} · {snapshot.summary.highRiskExceptionCount} high-risk
          exceptions
        </p>
      </header>
      <div className="provider-wait-breach-strip__counts">
        <div className="provider-wait-breach-strip__count">
          <strong>{visibility.awaitingClinicianCount}</strong>
          <span>Awaiting clinician</span>
        </div>
        <div className="provider-wait-breach-strip__count">
          <strong>{visibility.longestProviderWaitLabel}</strong>
          <span>Longest wait</span>
        </div>
        <div className="provider-wait-breach-strip__count">
          <strong>{visibility.averageProviderWaitLabel}</strong>
          <span>Average wait</span>
        </div>
        <div className="provider-wait-breach-strip__count" data-tone="watch">
          <strong>{visibility.approachingThresholdCount}</strong>
          <span>Approaching</span>
        </div>
        <div className="provider-wait-breach-strip__count" data-tone="critical">
          <strong>{visibility.breachedCount}</strong>
          <span>Breached</span>
        </div>
      </div>
      {previewPatients.length ? (
        <ul className="provider-wait-breach-strip__list">
          {previewPatients.map((patient) => {
            const row = snapshot.previewRows.find((entry) => entry.patientId === patient.id);
            return (
              <li key={patient.id}>
                <button
                  type="button"
                  className="provider-wait-breach-strip__item"
                  onClick={() => onSelectPatient?.(patient.id)}
                  disabled={!onSelectPatient}
                >
                  <span>
                    {[patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.mrn}
                  </span>
                  {row?.highRiskException ? (
                    <span className="provider-wait-breach-strip__exception">High-risk</span>
                  ) : null}
                  <ProviderWaitBreachBadge patient={patient} settings={settings} compact showElapsed />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
