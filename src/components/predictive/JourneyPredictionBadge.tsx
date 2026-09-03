import { useMemo } from 'react';
import type { BoardingSignals } from '../../services/boardingSignals';
import {
  predictPatientJourney,
  type PatientJourneyPrediction,
} from '../../engine/patientJourneyPrediction';
import type { Patient } from '../../types/emergency';
import { AiTruthLabel, fromEnhancementMaturity } from '../ai/AiTruthLabel';
import './JourneyPredictionBadge.css';

type JourneyPredictionBadgeProps = {
  patient: Patient;
  boardingSignals?: BoardingSignals | null;
  bedOccupancyPercent?: number;
  compact?: boolean;
  className?: string;
};

function toneForRisk(risk: PatientJourneyPrediction['prolongedStayRisk']): string {
  if (risk === 'high') return 'critical';
  if (risk === 'moderate') return 'warning';
  return 'stable';
}

export default function JourneyPredictionBadge({
  patient,
  boardingSignals = null,
  bedOccupancyPercent,
  compact = false,
  className = '',
}: JourneyPredictionBadgeProps) {
  const prediction = useMemo(
    () => predictPatientJourney({ patient, boardingSignals, bedOccupancyPercent }),
    [patient, boardingSignals, bedOccupancyPercent],
  );

  if (prediction.admissionBand === 'low' && prediction.prolongedStayRisk === 'low') {
    return null;
  }

  const truthLabel = fromEnhancementMaturity(prediction.envelope.maturity, {
    sourceContext: 'Boarding-signal-driven journey/LOS heuristic',
    reviewRequired: prediction.envelope.humanReviewRequired,
  });

  return (
    <span
      className={[
        'journey-prediction-badge',
        compact ? 'journey-prediction-badge--compact' : '',
        prediction.thresholdBreached ? 'journey-prediction-badge--alert' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={[...prediction.keyPredictors, prediction.envelope.disclaimer].join(' · ')}
      aria-label={`Admission probability ${prediction.admissionProbability} percent. Prolonged stay risk ${prediction.prolongedStayRisk}.`}
    >
      <span className="journey-prediction-badge__admission">
        Admission {prediction.admissionProbability}%
      </span>
      <span
        className={`journey-prediction-badge__los journey-prediction-badge__los--${toneForRisk(prediction.prolongedStayRisk)}`}
      >
        LOS risk {prediction.prolongedStayRisk}
      </span>
      {!compact && prediction.chestXrayUtilizationProbability >= 50 ? (
        <span className="journey-prediction-badge__cxr">
          CXR {prediction.chestXrayUtilizationProbability}%
        </span>
      ) : null}
      <AiTruthLabel {...truthLabel} compact />
    </span>
  );
}
