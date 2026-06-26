import React from 'react';
import { FileScan, UserPlus, UserRoundX, UserSearch, X } from 'lucide-react';
import { RECEPTION_COPY } from './receptionCopy';
import './PreparePatientChooser.css';

export default function PreparePatientChooser({
  onClose,
  onManual,
  onScan,
  onSmartIntake,
  onQuickCreate,
  onUnknown,
}) {
  const copy = RECEPTION_COPY.chooser;

  return (
    <div className="reception-prepare" role="dialog" aria-labelledby="prepare-patient-title">
      <div className="reception-prepare__panel">
        <header className="reception-prepare__header">
          <div>
            <p className="reception-prepare__eyebrow">{copy.eyebrow}</p>
            <h2 id="prepare-patient-title">{copy.title}</h2>
            <p className="reception-prepare__description">{copy.description}</p>
          </div>
          <button type="button" className="reception-prepare__close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="reception-prepare__options">
          <button type="button" className="reception-prepare__option reception-prepare__option--primary" onClick={onSmartIntake}>
            <UserSearch size={20} aria-hidden />
            <span>
              <strong>{copy.fullIdentity}</strong>
              <small>{copy.fullIdentityHint}</small>
            </span>
          </button>
          <button type="button" className="reception-prepare__option" onClick={onScan}>
            <FileScan size={20} aria-hidden />
            <span>
              <strong>{copy.scanId}</strong>
              <small>{copy.scanIdHint}</small>
            </span>
          </button>
          <button type="button" className="reception-prepare__option" onClick={onManual}>
            <UserPlus size={20} aria-hidden />
            <span>
              <strong>{copy.walkIn}</strong>
              <small>{copy.walkInHint}</small>
            </span>
          </button>
          {typeof onQuickCreate === 'function' ? (
            <button type="button" className="reception-prepare__option" onClick={onQuickCreate}>
              <UserPlus size={20} aria-hidden />
              <span>
                <strong>{copy.withSymptoms}</strong>
                <small>{copy.withSymptomsHint}</small>
              </span>
            </button>
          ) : null}
          <button type="button" className="reception-prepare__option" onClick={onUnknown}>
            <UserRoundX size={20} aria-hidden />
            <span>
              <strong>{copy.unknown}</strong>
              <small>{copy.unknownHint}</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
