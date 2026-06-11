import React, { useEffect, useMemo } from 'react';
import { AlertTriangle, ChevronUp } from 'lucide-react';
import { PatientState } from '../../types/emergency';
import { getPatientFlagType, hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import { REASSESSMENT_FLAG_TYPES } from '../../engine/reassessmentEngine';
import './ReassessmentDrawer.css';

const ACTIVE_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

const FLAG_PRIORITY = ['DeteriorationRisk', 'HighRisk', 'ReassessmentDue'];
const SEVERITY_RANK = {
  Critical: 0,
  Warning: 1,
  Info: 2,
};
const PATIENT_PRIORITY_RANK = {
  P1: 0,
  P2: 1,
  P3: 2,
  P4: 3,
  P5: 4,
};

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
  return patient.flags
    .filter((flag) => REASSESSMENT_FLAG_TYPES.includes(getPatientFlagType(flag)))
    .sort(
      (a, b) =>
        (SEVERITY_RANK[a.severity] ?? SEVERITY_RANK.Info) -
          (SEVERITY_RANK[b.severity] ?? SEVERITY_RANK.Info) ||
        FLAG_PRIORITY.indexOf(getPatientFlagType(a)) - FLAG_PRIORITY.indexOf(getPatientFlagType(b))
    )[0];
}

function hasReassessmentManagedFlag(patient) {
  return REASSESSMENT_FLAG_TYPES.some((flagType) => hasPatientFlag(patient, flagType));
}

function flagPriority(flag) {
  if (!flag) return FLAG_PRIORITY.length;
  const rank = FLAG_PRIORITY.indexOf(getPatientFlagType(flag));
  return rank === -1 ? FLAG_PRIORITY.length : rank;
}

function sortPatientsBySeverity(a, b) {
  const aFlag = primaryFlag(a);
  const bFlag = primaryFlag(b);

  return (
    (SEVERITY_RANK[aFlag?.severity] ?? SEVERITY_RANK.Info) -
      (SEVERITY_RANK[bFlag?.severity] ?? SEVERITY_RANK.Info) ||
    flagPriority(aFlag) - flagPriority(bFlag) ||
    (PATIENT_PRIORITY_RANK[a.priority] ?? PATIENT_PRIORITY_RANK.P5) -
      (PATIENT_PRIORITY_RANK[b.priority] ?? PATIENT_PRIORITY_RANK.P5) ||
    patientName(a).localeCompare(patientName(b))
  );
}

export default function ReassessmentDrawer({ open, count, onClose }) {
  const patients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);

  const reassessmentPatients = useMemo(
    () =>
      patients
        .filter((patient) => ACTIVE_STATES.has(patient.state) && hasReassessmentManagedFlag(patient))
        .sort(sortPatientsBySeverity),
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
