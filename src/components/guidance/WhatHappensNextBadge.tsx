import React from 'react';
import { resolveWhatHappensNext } from '../../services/whatHappensNextGuidance';
import './WhatHappensNextBadge.css';

export default function WhatHappensNextBadge({
  patient,
  referrals = ([] as any[]),
  staff = ([] as any[]),
  compact = false,
  showGuidance = false,
}) {
  if (!patient?.id) return null;

  const snapshot = resolveWhatHappensNext(patient, { referrals, staff });
  if (!snapshot) return null;

  return (
    <span
      className={[
        'what-next-badge',
        `what-next-badge--${snapshot.tone}`,
        compact ? 'what-next-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={[
        `Next: ${snapshot.label}`,
        showGuidance ? snapshot.guidance : null,
        snapshot.staffDetail,
        snapshot.secondarySteps.length
          ? `Also: ${snapshot.secondarySteps.map((step) => step.label).join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {compact ? `Next: ${snapshot.shortLabel}` : `Next: ${snapshot.label}`}
    </span>
  );
}
