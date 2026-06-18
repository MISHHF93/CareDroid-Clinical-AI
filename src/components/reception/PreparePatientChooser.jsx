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
            <p className="reception-prepare__eyebrow">Smart Intake options</p>
            <h2 id="prepare-patient-title">Choose an intake path</h2>
            <p className="reception-prepare__description">
              Smart Intake is the default arrival workflow. Use these options when you need OCR,
              walk-in quick entry, or unknown-patient handling.
            </p>
          </div>
          <button type="button" className="reception-prepare__close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="reception-prepare__options">
          <button type="button" className="reception-prepare__option reception-prepare__option--primary" onClick={onSmartIntake}>
            <UserSearch size={20} aria-hidden />
            <span>
              <strong>Full Smart Intake</strong>
              <small>Identity match, verify, allergies, medications, referral docs</small>
            </span>
          </button>
          <button type="button" className="reception-prepare__option" onClick={onScan}>
            <FileScan size={20} aria-hidden />
            <span>
              <strong>Scan ID / OCR</strong>
              <small>Jump to document capture and field extraction</small>
            </span>
          </button>
          <button type="button" className="reception-prepare__option" onClick={onManual}>
            <UserPlus size={20} aria-hidden />
            <span>
              <strong>Quick walk-in</strong>
              <small>Demographics, complaint, vitals, priority only</small>
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
