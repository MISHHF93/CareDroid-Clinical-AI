import React from 'react';
import {
  resolveProviderWaitBreachTimer,
  shouldSurfaceProviderWaitBreach,
} from '../../services/providerWaitBreachTimer';
import './ProviderWaitBreachBadge.css';

export default function ProviderWaitBreachBadge({
  patient,
  settings,
  now,
  compact = false,
  showElapsed = false,
}) {
  if (!patient?.id) return null;

  const snapshot = resolveProviderWaitBreachTimer(patient, {
    settings,
    now,
  });
  if (!shouldSurfaceProviderWaitBreach(snapshot)) return null;

  return (
    <span
      className={[
        'provider-wait-breach-badge',
        `provider-wait-breach-badge--${snapshot.tone}`,
        compact ? 'provider-wait-breach-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={[snapshot.label, snapshot.staffDetail].filter(Boolean).join(' · ')}
    >
      {compact ? `Provider ${snapshot.shortLabel}` : snapshot.label}
      {snapshot.highRiskException ? ' · HR' : null}
      {showElapsed ? ` · ${snapshot.elapsedLabel}` : null}
    </span>
  );
}
