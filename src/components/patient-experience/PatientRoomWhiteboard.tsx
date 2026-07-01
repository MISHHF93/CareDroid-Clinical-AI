import { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import { resolveOperationalPresentation } from '../../config/emergencyOperationalPresentationModel';
import type { Patient, Staff } from '../../types/emergency';
import { buildPatientRoomWhiteboardSnapshot } from '../../utils/patientRoomWhiteboardModel';
import OperationalPresentationFrame from '../emergency/OperationalPresentationFrame';
import './PatientRoomWhiteboard.css';

type PatientRoomWhiteboardProps = {
  patient: Patient;
  staff?: Staff[];
  title?: string;
  className?: string;
};

export default function PatientRoomWhiteboard({
  patient,
  staff = [] as any[],
  title,
  className = '',
}: PatientRoomWhiteboardProps) {
  const presentation = resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.publicWaiting);
  const snapshot = useMemo(
    () => buildPatientRoomWhiteboardSnapshot(patient, staff),
    [patient, staff],
  );

  return (
    <OperationalPresentationFrame
      screenMode={CARE_DROID_SCREEN_MODES.publicWaiting}
      as="section"
      className={['patient-room-whiteboard', className].filter(Boolean).join(' ')}
      aria-label="Patient room information display"
    >
      <header className="patient-room-whiteboard__header">
        <span>{EMERGENCY_OS_BRANDING.productName}</span>
        <h1>{title || presentation.pageTitle || 'Your care update'}</h1>
        <p>Hello, {snapshot.patientName}</p>
      </header>

      <div className="patient-room-whiteboard__status">
        <h2>Where you are now</h2>
        <p className="patient-room-whiteboard__status-label">{snapshot.statusLabel}</p>
        <p className="patient-room-whiteboard__wait">
          {snapshot.waitMinutes > 0
            ? `You have been here about ${snapshot.waitMinutes} minutes`
            : 'You were just checked in'}
        </p>
      </div>

      <div className="patient-room-whiteboard__team">
        <h2>Your care team</h2>
        <ul>
          {snapshot.careTeam.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>

      <div className="patient-room-whiteboard__next">
        <h2>What happens next</h2>
        <ul>
          {snapshot.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      {snapshot.dischargeInstructions.length ? (
        <div className="patient-room-whiteboard__discharge">
          <h2>Before you leave</h2>
          <ul>
            {snapshot.dischargeInstructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <footer className="patient-room-whiteboard__footer">
        <p>{snapshot.reassuranceMessage}</p>
      </footer>
    </OperationalPresentationFrame>
  );
}