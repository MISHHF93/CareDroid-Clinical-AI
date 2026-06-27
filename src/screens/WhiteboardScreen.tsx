import React, { useState } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientCard } from '../domain/patient/PatientCard';
import { PatientDetailFeature } from '../features/patient-detail/PatientDetailFeature';
import { AlertBadge } from '../domain/alerts/AlertBadge';
import { useAlertsCenter } from '../features/alerts-center/useAlertsCenter';
import { PatientState } from '../types/emergency';
import type { Patient } from '../types/emergency';
import './screens.css';

const BOARD_COLUMNS: { state: PatientState; label: string }[] = [
  { state: PatientState.Arrival,     label: 'Arrival' },
  { state: PatientState.Triage,      label: 'Triage' },
  { state: PatientState.Waiting,     label: 'Waiting' },
  { state: PatientState.Assessment,  label: 'Assessment' },
  { state: PatientState.Orders,      label: 'Orders' },
  { state: PatientState.Results,     label: 'Results' },
  { state: PatientState.Disposition, label: 'Disposition' },
];

const PRIORITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3, P5: 4 };

function byPriority(a: Patient, b: Patient) {
  const pa = PRIORITY_ORDER[String(a.priority)] ?? 5;
  const pb = PRIORITY_ORDER[String(b.priority)] ?? 5;
  return pa !== pb ? pa - pb : new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime();
}

export function WhiteboardScreen() {
  const patients = useEmergencyStore((s) => s.patients);
  const selectPatient = useEmergencyStore((s) => s.selectPatient);
  const selectedId = useEmergencyStore((s) => s.selectedPatientId);
  const [detailOpen, setDetailOpen] = useState(false);
  const { unread, maxSeverity } = useAlertsCenter();

  function handleSelect(patient: Patient) {
    selectPatient(patient.id);
    setDetailOpen(true);
  }

  return (
    <div className="cd-screen">
      <div className="cd-screen__header">
        <span className="cd-screen__title">ED Whiteboard</span>
        <span className="cd-screen__subtitle">{patients.length} patients</span>
        <div className="cd-screen__actions">
          <AlertBadge count={unread} maxSeverity={maxSeverity} />
        </div>
      </div>

      <div className="cd-screen__body" style={{ display: 'flex', overflow: 'hidden' }}>
        <div className="cd-whiteboard" style={{ flex: 1 }}>
          {BOARD_COLUMNS.map(({ state, label }) => {
            const col = patients.filter((p) => p.state === state).sort(byPriority);
            return (
              <div key={state} className="cd-wb-col">
                <div className="cd-wb-col__header">
                  <span className="cd-wb-col__name">{label}</span>
                  <span className="cd-wb-col__count">{col.length}</span>
                </div>
                <div className="cd-wb-col__body">
                  {col.map((p) => (
                    <PatientCard
                      key={p.id}
                      patient={p}
                      onClick={handleSelect}
                      tabIndex={0}
                      className={selectedId === p.id ? 'cd-patient-card--selected' : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {detailOpen && selectedId && (
          <div style={{ width: 380, borderLeft: '1px solid var(--cd-border-subtle)', flexShrink: 0, height: '100%', overflow: 'hidden' }}>
            <PatientDetailFeature patientId={selectedId} onBack={() => setDetailOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
