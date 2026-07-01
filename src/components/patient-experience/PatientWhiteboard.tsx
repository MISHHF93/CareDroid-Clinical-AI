import { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import { resolveOperationalPresentation } from '../../config/emergencyOperationalPresentationModel';
import type { Patient, Staff } from '../../types/emergency';
import { buildPatientWhiteboardSnapshot } from '../../utils/patientWhiteboardModel';
import OperationalPresentationFrame from '../emergency/OperationalPresentationFrame';
import './PatientWhiteboard.css';

type PatientWhiteboardProps = {
  patient: Patient;
  staff?: Staff[];
  title?: string;
  className?: string;
};

export default function PatientWhiteboard({
  patient,
  staff = [] as any[],
  title,
  className = '',
}: PatientWhiteboardProps) {
  const presentation = resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.publicWaiting);
  const snapshot = useMemo(
    () => buildPatientWhiteboardSnapshot(patient, staff),
    [patient, staff],
  );

  return (
    <OperationalPresentationFrame
      screenMode={CARE_DROID_SCREEN_MODES.publicWaiting}
      as="section"
      className={['patient-whiteboard', className].filter(Boolean).join(' ')}
      aria-label="Your care board"
    >
      <header className="patient-whiteboard__header">
        <span>{EMERGENCY_OS_BRANDING.productName}</span>
        <h1>{title || presentation.pageTitle || 'Your care board'}</h1>
        <p>Hello, {snapshot.patientFirstName}</p>
      </header>

      <div className="patient-whiteboard__card">
        <h2>Your care team</h2>
        <ul>
          {snapshot.careTeamMembers.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>

      <div className="patient-whiteboard__card patient-whiteboard__card--highlight">
        <h2>Next step</h2>
        <p>{snapshot.nextStep}</p>
      </div>

      <div className="patient-whiteboard__card">
        <h2>Estimated wait time</h2>
        <p className="patient-whiteboard__wait">{snapshot.estimatedWaitLabel}</p>
        <p className="patient-whiteboard__status">{snapshot.reassuranceLine}</p>
      </div>

      {snapshot.dischargeInstructions.length ? (
        <div className="patient-whiteboard__card">
          <h2>Discharge instructions</h2>
          <ul>
            {snapshot.dischargeInstructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <footer className="patient-whiteboard__footer">
        <p>Ask any team member if you have questions. We are here to help you.</p>
      </footer>
    </OperationalPresentationFrame>
  );
}