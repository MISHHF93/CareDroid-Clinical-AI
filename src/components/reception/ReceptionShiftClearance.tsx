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
  if (!open) return null;

  const total = emsCount + verificationCount + pretriageCount;
  const clear = total === 0;

  return (
    <div
      className="reception-shift-clearance"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reception-shift-clearance-title"
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
          <button type="button" className="reception-shift-clearance__close" onClick={onClose} aria-label="Close">
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
          <button type="button" className="reception-shift-clearance__primary" onClick={onRecordShiftNote}>
            Record shift handoff note
          </button>
        </footer>
      </div>
    </div>
  );
}
