import React from 'react';
import SmartIntake from '../../pages/emergency/SmartIntake';
import './ReceptionSmartIntakeOverlay.css';

export default function ReceptionSmartIntakeOverlay({ session, onClose, onHandoffComplete }) {
  if (!session) return null;

  return (
    <div className="reception-smart-intake-overlay" role="dialog" aria-modal="true" aria-label="Smart Intake">
      <SmartIntake
        key={`${session.step || 'capture'}-${session.patientId || 'new'}-${session.mode || 'standard'}`}
        embedded
        intakeOptions={session}
        onClose={onClose}
        onHandoffComplete={onHandoffComplete}
      />
    </div>
  );
}
