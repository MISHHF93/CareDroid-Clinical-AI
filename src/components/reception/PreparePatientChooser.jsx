import React from 'react';
import { FileScan, UserPlus, UserRoundX, UserSearch, X } from 'lucide-react';
import './PreparePatientChooser.css';

export default function PreparePatientChooser({
  onClose,
  onManual,
  onScan,
  onSmartIntake,
  onUnknown,
}) {
  return (
    <div className="reception-prepare" role="dialog" aria-labelledby="prepare-patient-title">
      <div className="reception-prepare__panel">
        <header className="reception-prepare__header">
          <div>
            <p className="reception-prepare__eyebrow">Reception workflow</p>
            <h2 id="prepare-patient-title">Prepare patient card</h2>
            <p className="reception-prepare__description">
              Build the patient record here first. Clinical departments receive the chart after
              reception handoff.
            </p>
          </div>
          <button type="button" className="reception-prepare__close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="reception-prepare__options">
          <button type="button" className="reception-prepare__option reception-prepare__option--primary" onClick={onManual}>
            <UserPlus size={20} aria-hidden />
            <span>
              <strong>Enter manually</strong>
              <small>Walk-in demographics, complaint, vitals, priority</small>
            </span>
          </button>
          <button type="button" className="reception-prepare__option" onClick={onScan}>
            <FileScan size={20} aria-hidden />
            <span>
              <strong>Scan ID / OCR</strong>
              <small>Document capture and field extraction</small>
            </span>
          </button>
          <button type="button" className="reception-prepare__option" onClick={onSmartIntake}>
            <UserSearch size={20} aria-hidden />
            <span>
              <strong>Full identity verification</strong>
              <small>Match, verify, allergies, medications, referral docs</small>
            </span>
          </button>
          <button type="button" className="reception-prepare__option" onClick={onUnknown}>
            <UserRoundX size={20} aria-hidden />
            <span>
              <strong>Unknown patient</strong>
              <small>Minimal identity, send to triage queue</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
