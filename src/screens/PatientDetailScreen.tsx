import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientDetailFeature } from '../features/patient-detail/PatientDetailFeature';
import { CANONICAL_ROUTES } from '../config/routes.config';
import './screens.css';

export function PatientDetailScreen() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const selectPatient = useEmergencyStore((s) => s.selectPatient);

  function handleBack() {
    selectPatient(null);
    navigate(CANONICAL_ROUTES.emergencyPatients);
  }

  return (
    <div className="cd-screen">
      <div className="cd-screen__body" style={{ overflowY: 'auto' }}>
        <PatientDetailFeature patientId={patientId} onBack={handleBack} />
      </div>
    </div>
  );
}
