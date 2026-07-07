import React, { useMemo } from 'react';
import {
  buildProviderWaitVisibilitySnapshot,
  hasProviderWaitVisibilityActivity,
} from '../../services/providerWaitVisibilityModel';
import './ProviderWaitBreachBadge.css';

export default function ProviderWaitBreachPanel({ patients = [] as any[], settings = null, className = '' }) {
  const visibility = useMemo(
    () =>
      buildProviderWaitVisibilitySnapshot(patients, {
        settings: settings ? { emergencySettings: settings } : undefined,
      }),
    [patients, settings],
  );

  if (!hasProviderWaitVisibilityActivity(visibility)) return null;

  const { summary } = visibility;

  return (
    <section
      className={['provider-wait-breach-panel', className].filter(Boolean).join(' ')}
      aria-label="Provider wait breach timer"
    >
      <header className="provider-wait-breach-panel__header">
        <p className="provider-wait-breach-panel__eyebrow">Triage to provider</p>
        <h3>Provider wait breach timer</h3>
        <p className="provider-wait-breach-panel__subtitle">
          CTAS thresholds · approaching from {summary.warningMinutes}m · default target{' '}
          {summary.defaultTargetMinutes}m
        </p>
      </header>
      <div className="provider-wait-breach-panel__grid">
        <div className="provider-wait-breach-panel__metric" data-tone="neutral">
          <strong>{visibility.awaitingClinicianCount}</strong>
          <span>Awaiting clinician</span>
        </div>
        <div
          className="provider-wait-breach-panel__metric"
          data-tone={visibility.breachedCount ? 'critical' : 'neutral'}
        >
          <strong>{visibility.longestProviderWaitLabel}</strong>
          <span>Longest provider wait</span>
        </div>
        <div className="provider-wait-breach-panel__metric" data-tone="neutral">
          <strong>{visibility.averageProviderWaitLabel}</strong>
          <span>Average provider wait</span>
        </div>
        <div className="provider-wait-breach-panel__metric" data-tone="watch">
          <strong>{visibility.approachingThresholdCount}</strong>
          <span>Approaching threshold</span>
        </div>
        <div className="provider-wait-breach-panel__metric" data-tone="critical">
          <strong>{visibility.breachedCount}</strong>
          <span>Breached threshold</span>
        </div>
      </div>
    </section>
  );
}
