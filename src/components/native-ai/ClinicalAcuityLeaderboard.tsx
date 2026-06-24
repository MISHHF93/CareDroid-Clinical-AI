import { useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import { buildClinicalAcuityLeaderboard } from '../../services/nativeAiCore';
import type { NativeAiDataSource } from '../../hooks/useNativeAiDashboardData';
import './ClinicalAcuityLeaderboard.css';
import './native-ai-dashboard-theme.css';

type ClinicalAcuityLeaderboardProps = {
  patients: Patient[];
  entries?: ReturnType<typeof buildClinicalAcuityLeaderboard>;
  dataSource?: NativeAiDataSource;
  onSelectPatient?: (patientId: string) => void;
  className?: string;
};

const ORIENTATION_LABELS = {
  admit: 'Admit',
  edou: 'EDOU',
  discharge: 'Discharge',
} as const;

export default function ClinicalAcuityLeaderboard({
  patients,
  entries: entriesProp,
  dataSource = 'local',
  onSelectPatient,
  className = '',
}: ClinicalAcuityLeaderboardProps) {
  const fallbackEntries = useMemo(() => buildClinicalAcuityLeaderboard(patients), [patients]);
  const entries = entriesProp?.length ? entriesProp : fallbackEntries;

  return (
    <section
      className={['clinical-acuity-leaderboard', className].filter(Boolean).join(' ')}
      aria-label="Clinical acuity leaderboard"
    >
      <header>
        <p className="clinical-acuity-leaderboard__eyebrow">Composite acuity score</p>
        <h3>Clinical Acuity Leaderboard</h3>
        <p className="clinical-acuity-leaderboard__subtitle">
          Triage level + admission likelihood + prolonged-stay risk + orientation signal.
          {dataSource === 'api' ? ' · Backend scores' : dataSource === 'loading' ? ' · Loading…' : ' · Local scores'}
        </p>
      </header>

      <div className="clinical-acuity-leaderboard__table" role="table">
        <div className="clinical-acuity-leaderboard__row clinical-acuity-leaderboard__row--head" role="row">
          <span role="columnheader">Patient</span>
          <span role="columnheader">Acuity</span>
          <span role="columnheader">Triage</span>
          <span role="columnheader">Admit %</span>
          <span role="columnheader">Prolonged %</span>
          <span role="columnheader">Orientation</span>
        </div>
        {entries.slice(0, 15).map((entry) => (
          <div key={entry.patientId} className="clinical-acuity-leaderboard__row" role="row">
            <span role="cell">
              {onSelectPatient ? (
                <button type="button" onClick={() => onSelectPatient(entry.patientId)}>
                  {entry.patientLabel}
                </button>
              ) : (
                entry.patientLabel
              )}
              <small>{entry.sourceState}</small>
            </span>
            <span role="cell" className="clinical-acuity-leaderboard__score">
              {entry.acuityScore}
            </span>
            <span role="cell">{entry.triageLevel}</span>
            <span role="cell">{entry.admissionProbability}%</span>
            <span role="cell">{entry.prolongedStayProbability}%</span>
            <span role="cell">
              {entry.orientation ? ORIENTATION_LABELS[entry.orientation] : '—'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}