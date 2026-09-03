import React, { useMemo } from 'react';
import {
  buildTriageBreachVisibilitySnapshot,
  hasTriageBreachVisibilityActivity,
} from '../../services/triageBreachVisibilityModel';
import './TriageBreachBadge.css';

export default function TriageBreachPanel({
  patients = [] as any[],
  settings = null,
  className = '',
}) {
  const visibility = useMemo(
    () =>
      buildTriageBreachVisibilitySnapshot(patients, {
        settings: settings ? { emergencySettings: settings } : undefined,
      }),
    [patients, settings],
  );

  if (!hasTriageBreachVisibilityActivity(visibility)) return null;

  const { summary } = visibility;

  return (
    <section
      className={['triage-breach-panel', className].filter(Boolean).join(' ')}
      aria-label="Triage breach timer"
    >
      <header className="triage-breach-panel__header">
        <p className="triage-breach-panel__eyebrow">Arrival to triage</p>
        <h3>Triage breach timer</h3>
        <p className="triage-breach-panel__subtitle">
          Target {summary.targetMinutes}m · approaching from {summary.warningMinutes}m
        </p>
      </header>
      <div className="triage-breach-panel__grid">
        <div className="triage-breach-panel__metric" data-tone="neutral">
          <strong>{visibility.awaitingTriageCount}</strong>
          <span>Awaiting triage</span>
        </div>
        <div
          className="triage-breach-panel__metric"
          data-tone={visibility.breachedCount ? 'critical' : 'neutral'}
        >
          <strong>{visibility.longestUntriagedWaitLabel}</strong>
          <span>Longest untriaged wait</span>
        </div>
        <div className="triage-breach-panel__metric" data-tone="watch">
          <strong>{visibility.approachingBreachCount}</strong>
          <span>Approaching breach</span>
        </div>
        <div className="triage-breach-panel__metric" data-tone="critical">
          <strong>{visibility.breachedCount}</strong>
          <span>Breached</span>
        </div>
        <div
          className="triage-breach-panel__metric"
          data-tone={visibility.rapidReviewFlags ? 'watch' : 'neutral'}
        >
          <strong>{visibility.rapidReviewFlags}</strong>
          <span>Rapid-review flags</span>
        </div>
      </div>
    </section>
  );
}
