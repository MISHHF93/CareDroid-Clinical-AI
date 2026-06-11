import React, { useEffect, useMemo } from 'react';
import { AlertTriangle, ChevronUp } from 'lucide-react';
import { PatientState } from '../../types/emergency';
import { getPatientFlagType, hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import './ReassessmentDrawer.css';

const ACTIVE_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

const FLAG_PRIORITY = ['DeteriorationRisk', 'HighRisk', 'LongWait', 'ReassessmentDue'];

function patientName(patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function formatFlagTime(timestamp) {
  if (!timestamp) return '--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function primaryFlag(patient) {
  return (
    FLAG_PRIORITY.map((type) =>
      patient.flags.find((flag) => getPatientFlagType(flag) === type)
    ).find(Boolean) || patient.flags.find((flag) => getPatientFlagType(flag) === 'ReassessmentDue')
  );
}

function sortRank(patient) {
  const rank = FLAG_PRIORITY.findIndex((type) => hasPatientFlag(patient, type));
  return rank === -1 ? FLAG_PRIORITY.length : rank;
}

export default function ReassessmentDrawer({ open, count, onClose }) {
  const patients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);

  const reassessmentPatients = useMemo(
    () =>
      patients
        .filter(
          (patient) =>
            ACTIVE_STATES.has(patient.state) && hasPatientFlag(patient, 'ReassessmentDue')
        )
        .sort((a, b) => sortRank(a) - sortRank(b) || a.priority.localeCompare(b.priority)),
    [patients]
  );

  useEffect(() => {
    if (open && reassessmentPatients.length === 0) {
      onClose();
    }
  }, [open, reassessmentPatients.length, onClose]);

  const isVisible = open && reassessmentPatients.length > 0;

  return (
    <section
      className={`reassessment-drawer${isVisible ? ' reassessment-drawer--open' : ''}`}
      aria-hidden={!isVisible}
      aria-labelledby="reassessment-drawer-title"
    >
      <header className="reassessment-drawer__header">
        <div>
          <span className="reassessment-drawer__eyebrow">Live safety queue</span>
          <h2 id="reassessment-drawer-title">Reassessment Required</h2>
        </div>
        <strong>{count}</strong>
        <button type="button" onClick={onClose} aria-label="Close reassessment drawer">
          <ChevronUp size={17} aria-hidden />
        </button>
      </header>

      <div className="reassessment-drawer__list" role="list">
        {reassessmentPatients.map((patient) => {
          const flag = primaryFlag(patient);
          const flagType = flag ? getPatientFlagType(flag) : 'ReassessmentDue';

          return (
            <article
              key={patient.id}
              className={`reassessment-drawer__row reassessment-drawer__row--${patient.priority.toLowerCase()}`}
              role="listitem"
            >
              <span className="reassessment-drawer__priority-bar" aria-hidden />
              <div className="reassessment-drawer__identity">
                <strong>{patientName(patient)}</strong>
                <span>
                  {patient.priority} · {patient.mrn}
                </span>
              </div>
              <div className="reassessment-drawer__complaint">{patient.complaintCategory}</div>
              <div className="reassessment-drawer__reason">
                <AlertTriangle size={14} aria-hidden />
                <span>{flag?.reason || flagType}</span>
              </div>
              <time className="reassessment-drawer__time" dateTime={flag?.detectedAt}>
                {formatFlagTime(flag?.detectedAt)}
              </time>
              <button
                type="button"
                className="reassessment-drawer__assess"
                onClick={() => {
                  selectPatient(patient.id);
                  onClose();
                }}
              >
                Assess Now
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
