import React, { useState } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import { TriageQueueFeature } from '../features/triage-queue/TriageQueueFeature';
import { PatientDetailFeature } from '../features/patient-detail/PatientDetailFeature';
import type { Patient } from '../types/emergency';
import './screens.css';

export function TriageQueueScreen() {
  const selectedId = useEmergencyStore((s) => s.selectedPatientId);
  const selectPatient = useEmergencyStore((s) => s.selectPatient);
  const [hasSelection, setHasSelection] = useState(false);

  function handleSelectPatient(patient: Patient) {
    selectPatient(patient.id);
    setHasSelection(true);
  }

  return (
    <div className="cd-screen">
      <div className="cd-screen__body">
        <div className="cd-split">
          <div className="cd-split__pane cd-split__pane--left">
            <TriageQueueFeature onSelectPatient={handleSelectPatient} />
          </div>
          <div className="cd-split__pane">
            <PatientDetailFeature
              patientId={selectedId ?? undefined}
              onBack={hasSelection ? () => { selectPatient(null); setHasSelection(false); } : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
