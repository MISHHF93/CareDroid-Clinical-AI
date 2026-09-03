import { useRef } from 'react';
import useModalDialog from '../../hooks/useModalDialog';
import { ClipboardList, X } from 'lucide-react';
import type { Patient } from '../../types/emergency';
import './ReceptionShiftClearance.css';

export type ReceptionShiftClearanceProps = {
  open: boolean;
  emsCount: number;
  verificationCount: number;
  pretriageCount: number;
  verificationPatients: Patient[];
  patientDisplayName: (patient: Patient) => string;
  onClose: () => void;
  onJumpTab: (tab: 'ems' | 'verification' | 'pretriage') => void;
  onOpenPatient: (patientId: string) => void;
  onRecordShiftNote: () => void;
};

/**
 * End-of-shift clearance — empty or hand off ID-check and waiting-for-nurse lists.
 */
export default function ReceptionShiftClearance({
  open,
  emsCount,
  verificationCount,
  pretriageCount,
  verificationPatients,
  patientDisplayName,
  onClose,
  onJumpTab,
  onOpenPatient,
  onRecordShiftNote,
}: ReceptionShiftClearanceProps) {
  // HEAL-270: same fake-backdrop bug as PreparePatientChooser -- this
  // outer element is its own dimmed full-screen scrim
  // (ReceptionShiftClearance.css: position: fixed, inset: 0, background
  // rgba(...)), visually a dismissable modal, but had no onClick and no
  // Escape handler.
  // Escape was added by hand; the containment this dialog's own aria-modal="true"
  // promises was not. Declared before the early return below so hook order stays
  // stable across open and closed renders.
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog(dialogRef, { onClose, enabled: open });

  if (!open) return null;

  const total = emsCount + verificationCount + pretriageCount;
  const clear = total === 0;

  return (
    // Click-to-dismiss on the scrim is a mouse-only convenience layered on top
    // of two real keyboard-accessible paths: the Escape handler above and the
    // close button below. The scrim itself isn't meant to be its own focusable
    // control, so it doesn't need a redundant onKeyDown of its own.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="reception-shift-clearance"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reception-shift-clearance-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="reception-shift-clearance__panel">
        <header className="reception-shift-clearance__header">
          <div>
            <p className="reception-shift-clearance__eyebrow">
              <ClipboardList size={14} aria-hidden="true" /> End of shift
            </p>
            <h2 id="reception-shift-clearance-title">Clear your lists</h2>
            <p className="reception-shift-clearance__intro">
              {clear
                ? 'All reception lists look empty. Record a shift note if you handed work off verbally.'
                : `${total} patient${total === 1 ? '' : 's'} still need registration follow-up before you leave.`}
            </p>
          </div>
          <button
            type="button"
            className="reception-shift-clearance__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <ul className="reception-shift-clearance__counts">
          <li>
            <button type="button" onClick={() => onJumpTab('ems')}>
              <strong>{emsCount}</strong>
              <span>Ambulance</span>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onJumpTab('verification')}>
              <strong>{verificationCount}</strong>
              <span>Need ID check</span>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onJumpTab('pretriage')}>
              <strong>{pretriageCount}</strong>
              <span>Waiting for nurse</span>
            </button>
          </li>
        </ul>

        {verificationPatients.length ? (
          <section className="reception-shift-clearance__list" aria-label="Provisional patients">
            <h3>Finish ID on these first</h3>
            <ul>
              {verificationPatients.slice(0, 5).map((patient) => (
                <li key={patient.id}>
                  <button type="button" onClick={() => onOpenPatient(patient.id)}>
                    {patientDisplayName(patient)}
                    <small>{patient.registrationStatus || patient.state}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="reception-shift-clearance__footer">
          <button type="button" className="reception-shift-clearance__secondary" onClick={onClose}>
            Keep working
          </button>
          <button
            type="button"
            className="reception-shift-clearance__primary"
            onClick={onRecordShiftNote}
          >
            Record shift handoff note
          </button>
        </footer>
      </div>
    </div>
  );
}
