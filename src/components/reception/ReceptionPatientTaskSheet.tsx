import { useEffect } from 'react';
import { FolderOpen, ShieldAlert, UserCheck, X, ArrowRight } from 'lucide-react';
import type { Patient } from '../../types/emergency';
import './ReceptionPatientTaskSheet.css';

export type ReceptionPatientTaskSheetProps = {
  patient: Patient;
  displayName: string;
  statusLabel: string;
  nextStepLabel: string;
  ownerLabel: string;
  waitMinutes: number;
  isHighRisk: boolean;
  canEscalate: boolean;
  canSmartIntake: boolean;
  onClose: () => void;
  onCompleteId: () => void;
  onEscalate: () => void;
  onHandoff: () => void;
  onOpenFullRecord: () => void;
  interpreterNeeded?: string;
  preferredLanguage?: string;
};

/**
 * Action-first patient sheet for reception — not a static field dump.
 */
export default function ReceptionPatientTaskSheet({
  patient,
  displayName,
  statusLabel,
  nextStepLabel,
  ownerLabel,
  waitMinutes,
  isHighRisk,
  canEscalate,
  canSmartIntake,
  onClose,
  onCompleteId,
  onEscalate,
  onHandoff,
  onOpenFullRecord,
  interpreterNeeded,
  preferredLanguage,
}: ReceptionPatientTaskSheetProps) {
  const flagLabels = (patient.flags || []).slice(0, 2).map((flag) => String(flag));
  const provisional =
    patient.registrationStatus === 'provisional' || patient.registrationStatus === 'in-progress';
  const intakeMeta = (patient.notes || []).find((note) => note.metadata?.source === 'reception-command-desk')
    ?.metadata as { interpreterNeeded?: string; preferredLanguage?: string } | undefined;
  const language =
    preferredLanguage ||
    intakeMeta?.preferredLanguage ||
    '';
  const interpreter =
    interpreterNeeded ||
    intakeMeta?.interpreterNeeded ||
    '';

  // HEAL-273: this dialog had no local Escape handling at all -- it only
  // closed on Escape because ReceptionWorkspace.tsx special-cases
  // patientDetailOpen in one global page-level keydown handler. Reused
  // anywhere else (or if that one page-level branch is ever dropped),
  // it silently loses all keyboard dismissal. Self-contained, matching
  // every other dialog fixed this batch (HEAL-261/263/270/271/272).
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="reception-task-sheet"
      role="dialog"
      aria-label={`Patient tasks: ${displayName}`}
      aria-modal="true"
    >
      <header className="reception-task-sheet__header">
        <div className="reception-task-sheet__identity">
          <strong>{displayName}</strong>
          <span className="reception-task-sheet__mrn">{patient.mrn}</span>
          {isHighRisk ? (
            <span className="reception-task-sheet__chip reception-task-sheet__chip--critical" data-tone="critical">
              High risk
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="reception-task-sheet__close"
          onClick={onClose}
          aria-label="Close patient tasks"
        >
          <X size={16} />
        </button>
      </header>

      <div className="reception-task-sheet__body">
        <p className="reception-task-sheet__next">
          <span className="reception-task-sheet__eyebrow">Next step</span>
          <strong>{nextStepLabel}</strong>
        </p>

        <dl className="reception-task-sheet__meta">
          <div>
            <dt>Status</dt>
            <dd>{statusLabel}</dd>
          </div>
          <div>
            <dt>Wait</dt>
            <dd>{waitMinutes}m</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{ownerLabel}</dd>
          </div>
          <div>
            <dt>Arrival</dt>
            <dd>{patient.arrival?.arrivalMode || patient.source || '—'}</dd>
          </div>
          {language || interpreter === 'yes' ? (
            <div>
              <dt>Language</dt>
              <dd>
                {language || '—'}
                {interpreter === 'yes' ? ' · Interpreter needed' : ''}
              </dd>
            </div>
          ) : null}
        </dl>

        {flagLabels.length ? (
          <div className="reception-task-sheet__flags" aria-label="Flags">
            {flagLabels.map((flag) => (
              <span key={flag} className="reception-task-sheet__chip" data-tone="warning">
                {flag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="reception-task-sheet__actions">
          {canSmartIntake || provisional ? (
            <button type="button" className="reception-task-sheet__action reception-task-sheet__action--primary" onClick={onCompleteId}>
              <UserCheck size={16} aria-hidden />
              {provisional ? 'Complete identity' : 'Check identity'}
            </button>
          ) : null}
          {canEscalate ? (
            <button
              type="button"
              className={`reception-task-sheet__action${isHighRisk ? ' reception-task-sheet__action--critical' : ''}`}
              onClick={onEscalate}
            >
              <ShieldAlert size={16} aria-hidden />
              Escalate to nurse
            </button>
          ) : null}
          <button type="button" className="reception-task-sheet__action" onClick={onHandoff}>
            <ArrowRight size={16} aria-hidden />
            Continue to triage
          </button>
        </div>
      </div>

      <footer className="reception-task-sheet__footer">
        <button type="button" className="reception-task-sheet__secondary" onClick={onOpenFullRecord}>
          <FolderOpen size={14} aria-hidden />
          Open full record
        </button>
      </footer>
    </div>
  );
}
