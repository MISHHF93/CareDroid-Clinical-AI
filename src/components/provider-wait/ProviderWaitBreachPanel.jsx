import React, { useMemo } from 'react';
import { summarizeProviderWaitBreachBoard } from '../../services/providerWaitBreachTimer';
import './ProviderWaitBreachBadge.css';

export default function ProviderWaitBreachPanel({ patients = [], settings = null, className = '' }) {
  const summary = useMemo(
    () => summarizeProviderWaitBreachBoard(patients, { settings: settings || undefined }),
    [patients, settings],
  );

  if (!summary.awaitingProviderCount) return null;

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
          <strong>{summary.awaitingProviderCount}</strong>
          <span>Awaiting provider</span>
        </div>
        <div className="provider-wait-breach-panel__metric" data-tone="watch">
          <strong>{summary.approachingThresholdCount}</strong>
          <span>Approaching</span>
        </div>
        <div className="provider-wait-breach-panel__metric" data-tone="critical">
          <strong>{summary.breachedCount}</strong>
          <span>Breached</span>
        </div>
        <div className="provider-wait-breach-panel__metric" data-tone={summary.highRiskExceptionCount ? 'watch' : 'neutral'}>
          <strong>{summary.highRiskExceptionCount}</strong>
          <span>High-risk exceptions</span>
        </div>
        <div className="provider-wait-breach-panel__metric" data-tone={summary.breachedCount ? 'critical' : 'neutral'}>
          <strong>{summary.longestElapsedLabel}</strong>
          <span>Longest elapsed</span>
        </div>
      </div>
    </section>
  );
}
