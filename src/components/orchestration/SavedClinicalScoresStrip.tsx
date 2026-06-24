import { useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import {
  formatScoreAge,
  getRecentSavedScores,
  scoreRiskTone,
} from '../../utils/clinicalScoreEvents';
import './orchestration.css';

type SavedClinicalScoresStripProps = {
  patient: Patient;
};

export default function SavedClinicalScoresStrip({ patient }: SavedClinicalScoresStripProps) {
  const scores = useMemo(() => getRecentSavedScores(patient), [patient]);

  if (!scores.length) return null;

  return (
    <section className="patient-orchestration patient-orchestration--scores" aria-label="Recent clinical scores">
      <div className="patient-orchestration__header">
        <strong>Saved scores</strong>
        <span className="patient-orchestration__meta">Last 4 hours</span>
      </div>
      <div className="patient-orchestration__chips">
        {scores.map((score) => (
          <span
            key={`${score.toolId || score.shortLabel}-${score.timestamp}`}
            className={`patient-orchestration__chip patient-orchestration__chip--${score.tone || scoreRiskTone(score.band)}`}
            title={[score.band, score.recommendation, formatScoreAge(score.timestamp)].filter(Boolean).join(' · ')}
          >
            {score.shortLabel} {score.result ?? '--'}
            <small>{formatScoreAge(score.timestamp)}</small>
          </span>
        ))}
      </div>
    </section>
  );
}