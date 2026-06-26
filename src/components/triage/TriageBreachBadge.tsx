import React from 'react';
import {
  resolveTriageBreachTimer,
  shouldSurfaceTriageBreach,
} from '../../services/triageBreachTimer';
import './TriageBreachBadge.css';

export default function TriageBreachBadge({
  patient,
  settings = (undefined as any),
  targetMinutes = undefined,
  warningMinutes = undefined,
  now = undefined,
  compact = false,
  showElapsed = false,
}) {
  if (!patient?.id) return null;

  const snapshot: any = resolveTriageBreachTimer(patient, {
    settings,
    targetMinutes,
    warningMinutes,
    now,
  });
  if (!shouldSurfaceTriageBreach(snapshot)) return null;

  return (
    <span
      className={[
        'triage-breach-badge',
        `triage-breach-badge--${snapshot.tone}`,
        compact ? 'triage-breach-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={[snapshot.label, snapshot.staffDetail].filter(Boolean).join(' · ')}
    >
      {compact ? `Triage ${snapshot.shortLabel}` : snapshot.label}
      {showElapsed ? ` · ${snapshot.elapsedLabel}` : null}
    </span>
  );
}
