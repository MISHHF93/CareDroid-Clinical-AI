import React, { useMemo } from 'react';
import {
  buildDeteriorationWatchAttentionSnapshot,
  resolveDeteriorationWatch,
  summarizeDeteriorationWatchBoard,
} from '../../services/waitingRoomDeteriorationWatch';
import DeteriorationWatchBadge from './DeteriorationWatchBadge';
import './DeteriorationWatchBadge.css';

const LEVELS = [
  { id: 'urgent-review', label: 'Urgent' },
  { id: 'review-needed', label: 'Re-review' },
  { id: 'watch', label: 'Watch' },
];

export default function DeteriorationWatchStrip({
  patients = [] as any[],
  emsArrivals = [] as any[],
  onSelectPatient,
  className = '',
}) {
  const context = useMemo(() => ({ emsArrivals }), [emsArrivals]);

  const snapshot = useMemo(
    () => buildDeteriorationWatchAttentionSnapshot(patients, context),
    [context, patients],
  );

  const counts = useMemo(
    () => summarizeDeteriorationWatchBoard(patients, context),
    [context, patients],
  );

  const visible = LEVELS.filter((level) => counts[level.id] > 0);
  if (!visible.length && !snapshot.previewRows.length) return null;

  const previewPatients = patients.filter((patient) =>
    snapshot.previewRows.some((row) => row.patientId === patient.id),
  );

  return (
    <section
      className={['deterioration-watch-strip', className].filter(Boolean).join(' ')}
      aria-label="Waiting room deterioration watch summary"
    >
      <header className="deterioration-watch-strip__header">
        <div>
          <p className="deterioration-watch-strip__eyebrow">Operational advisory</p>
          <h3>Deterioration watch</h3>
          <p className="deterioration-watch-strip__subtitle">
            Patients who may need staff re-review based on vitals, reassessment delays, high-risk
            complaint, and EMS/intake observations — advisory only.
          </p>
        </div>
      </header>
      {visible.length ? (
        <div className="deterioration-watch-strip__counts">
          {visible.map((level) => {
            const samplePatient = patients.find(
              (patient) => resolveDeteriorationWatch(patient, context)?.level === level.id,
            );
            return (
              <div key={level.id} className="deterioration-watch-strip__count">
                <strong>{counts[level.id]}</strong>
                {samplePatient ? (
                  <DeteriorationWatchBadge
                    patient={samplePatient}
                    emsArrivals={emsArrivals}
                    compact
                  />
                ) : (
                  <span>{level.label}</span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
      {previewPatients.length ? (
        <ul className="deterioration-watch-strip__list">
          {previewPatients.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                className="deterioration-watch-strip__item"
                onClick={() => onSelectPatient?.(patient.id)}
                disabled={!onSelectPatient}
              >
                <span>
                  {[patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.mrn}
                </span>
                <DeteriorationWatchBadge patient={patient} emsArrivals={emsArrivals} compact />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
