import React, { useMemo } from 'react';
import {
  buildPatientExperienceBoardSummary,
  resolvePatientExperienceStatus,
} from '../../services/patientExperienceStatus';
import PatientExperienceStatusBadge from './PatientExperienceStatusBadge';
import './PatientExperienceStatusStrip.css';

export default function PatientExperienceStatusStrip({
  patients = [] as any[],
  referrals = [] as any[],
  className = '',
  onSelectPatient,
}) {
  const summary = useMemo(
    () => buildPatientExperienceBoardSummary(patients, { referrals }),
    [patients, referrals],
  );

  if (!summary.statusLines.length) return null;

  return (
    <section
      className={['patient-experience-strip', className].filter(Boolean).join(' ')}
      aria-label="Patient experience status summary"
    >
      <header className="patient-experience-strip__header">
        <div>
          <p className="patient-experience-strip__eyebrow">Patient experience layer</p>
          <h3>Understandable status map</h3>
          <p className="patient-experience-strip__subtitle">
            Staff view mapping journey and queue states to patient-safe process labels — no public PHI.
          </p>
        </div>
      </header>
      <div className="patient-experience-strip__counts">
        {summary.statusLines.map((line) => {
          const samplePatient = patients.find(
            (patient) =>
              resolvePatientExperienceStatus(patient, { referrals }).id === line.id,
          );
          return (
            <div key={line.id} className="patient-experience-strip__count" data-tone={line.tone}>
              <strong>{line.count}</strong>
              {samplePatient ? (
                <button
                  type="button"
                  className="patient-experience-strip__sample"
                  onClick={() => onSelectPatient?.(samplePatient.id)}
                  disabled={!onSelectPatient}
                  title={line.label}
                >
                  <PatientExperienceStatusBadge
                    patient={samplePatient}
                    referrals={referrals}
                    compact
                    showStaffDetail
                  />
                </button>
              ) : (
                <span>{line.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
