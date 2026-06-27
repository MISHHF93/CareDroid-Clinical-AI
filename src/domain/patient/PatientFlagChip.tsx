import React from 'react';
import type { PatientFlagRecord, PatientFlagType } from '../../types/emergency';
import './patient.css';

const FLAG_LABELS: Partial<Record<PatientFlagType, string>> = {
  SepsisAlert: 'Sepsis', ReassessmentDue: 'Reassess', DeteriorationRisk: 'Deteriorating',
  LWBSRisk: 'LWBS Risk', LongWait: 'Long Wait', HighRisk: 'High Risk',
  PsychAlert: 'Psych', Isolation: 'Isolation', StrokeCode: 'Stroke',
  DeterioratingNeuro: 'Neuro↓', PendingAdmission: 'Admitting', EMSArrival: 'EMS',
  IdentityPending: 'No ID', ScoreReassessmentRecommended: 'Score Due',
};

type PatientFlagChipProps = {
  flag: PatientFlagType | PatientFlagRecord;
  className?: string;
};

export function PatientFlagChip({ flag, className }: PatientFlagChipProps) {
  const type = typeof flag === 'string' ? flag : flag.type;
  const severity = typeof flag === 'string' ? 'Info' : (flag.severity ?? 'Info');
  const label = FLAG_LABELS[type as PatientFlagType] ?? type;
  const tone = severity === 'Critical' ? 'critical' : severity === 'Warning' ? 'warning' : 'info';

  return (
    <span className={['cd-flag-chip', `cd-flag-chip--${tone}`, className ?? ''].filter(Boolean).join(' ')}>
      {label}
    </span>
  );
}
