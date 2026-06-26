import React, { useMemo } from 'react';
import {
  buildLwbsRiskAttentionSnapshot,
  resolveLwbsRisk,
  summarizeLwbsRiskBoard,
} from '../../services/lwbsRiskLayer';
import LwbsRiskBadge from './LwbsRiskBadge';
import './LwbsRiskBadge.css';

const LEVELS = [
  { id: 'elevated', label: 'Elevated' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
];

export default function LwbsRiskStrip({
  patients = [] as any[],
  workflowLogs = [] as any[],
  staff = [] as any[],
  onSelectPatient,
  className = '',
}) {
  const waitingPatientCount = useMemo(
    () => patients.filter((patient) => patient.state === 'Waiting').length,
    [patients],
  );

  const context = useMemo(
    () => ({ waitingPatientCount, workflowLogs, staff }),
    [staff, waitingPatientCount, workflowLogs],
  );

  const snapshot = useMemo(
    () => buildLwbsRiskAttentionSnapshot(patients, context),
    [context, patients],
  );

  const counts = useMemo(
    () => summarizeLwbsRiskBoard(patients, context),
    [context, patients],
  );

  const visible = LEVELS.filter((level) => counts[level.id] > 0);
  if (!visible.length && !snapshot.previewRows.length) return null;

  const previewPatients = patients.filter((patient) =>
    snapshot.previewRows.some((row) => row.patientId === patient.id),
  );

  return (
    <section
      className={['lwbs-risk-strip', className].filter(Boolean).join(' ')}
      aria-label="LWBS advisory risk summary"
    >
      <header className="lwbs-risk-strip__header">
        <div>
          <p className="lwbs-risk-strip__eyebrow">Operational advisory</p>
          <h3>LWBS risk</h3>
          <p className="lwbs-risk-strip__subtitle">
            Non-clinical left-without-being-seen risk from wait, reassessment, contact, congestion, time of day, and complaint context — advisory only.
          </p>
        </div>
      </header>
      {visible.length ? (
        <div className="lwbs-risk-strip__counts">
          {visible.map((level) => {
            const samplePatient = patients.find(
              (patient) => resolveLwbsRisk(patient, context)?.level === level.id,
            );
            return (
              <div key={level.id} className="lwbs-risk-strip__count">
                <strong>{counts[level.id]}</strong>
                {samplePatient ? (
                  <LwbsRiskBadge
                    patient={samplePatient}
                    waitingPatientCount={waitingPatientCount}
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
        <ul className="lwbs-risk-strip__list">
          {previewPatients.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                className="lwbs-risk-strip__item"
                onClick={() => onSelectPatient?.(patient.id)}
                disabled={!onSelectPatient}
              >
                <span>
                  {[patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.mrn}
                </span>
                <LwbsRiskBadge
                  patient={patient}
                  waitingPatientCount={waitingPatientCount}
                  compact
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
