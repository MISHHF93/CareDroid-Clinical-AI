import { useEffect } from 'react';
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

  // HEAL-270: this dialog's outer element IS its own dimmed full-screen
  // scrim (see PreparePatientChooser.css -- position: fixed, inset: 0,
  // background rgba(...)), visually identical to a dismissable modal, but
  // had no onClick and no Escape handler -- only the small X button
  // worked. Same fix shape as HEAL-261/263.
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    // Click-to-dismiss on the scrim is a mouse-only convenience layered on top
    // of two real keyboard-accessible paths: the Escape handler above and the
    // close button below. The scrim itself isn't meant to be its own focusable
    // control, so it doesn't need a redundant onKeyDown of its own.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="reception-prepare"
      role="dialog"
      aria-labelledby="prepare-patient-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
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
