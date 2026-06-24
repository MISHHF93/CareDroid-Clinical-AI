import { useMemo } from 'react';
import type { BoardingSignals } from '../../services/boardingSignals';
import { assessPatientAdmissionProbability } from '../../services/predictiveAdmissionModel';
import type { Patient } from '../../types/emergency';
import './AdmissionProbabilityBadge.css';

type AdmissionProbabilityBadgeProps = {
  patient: Patient;
  boardingSignals?: BoardingSignals | null;
  abnormalLabs?: boolean;
  pendingOrders?: number;
  consultPending?: boolean;
  compact?: boolean;
  className?: string;
};

export default function AdmissionProbabilityBadge({
  patient,
  boardingSignals = null,
  abnormalLabs,
  pendingOrders,
  consultPending,
  compact = false,
  className = '',
}: AdmissionProbabilityBadgeProps) {
  const assessment = useMemo(
    () =>
      assessPatientAdmissionProbability({
        patient,
        boardingSignals,
        abnormalLabs,
        pendingOrders,
        consultPending,
      }),
    [abnormalLabs, boardingSignals, consultPending, patient, pendingOrders],
  );

  if (assessment.admitScore <= 2 && !assessment.thresholdBreached) {
    return null;
  }

  return (
    <span
      className={[
        'admission-probability-badge',
        compact ? 'admission-probability-badge--compact' : '',
        assessment.thresholdBreached ? 'admission-probability-badge--alert' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={assessment.rationale.join(' · ')}
      aria-label={`Admission probability ${assessment.probabilityPercent} percent. Admit score ${assessment.admitScore} out of ${assessment.admitScoreMax}.`}
    >
      Admit Score: {assessment.admitScore}/{assessment.admitScoreMax}
    </span>
  );
}