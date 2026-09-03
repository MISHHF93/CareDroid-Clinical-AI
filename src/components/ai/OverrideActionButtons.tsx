import { Check, Pencil, Siren, X } from 'lucide-react';
import './AIComponents.css';

type OverrideActionButtonsProps = {
  label?: string;
  onAccept?: () => void;
  onModify?: () => void;
  onDismiss?: () => void;
  onEscalate?: () => void;
  acceptLabel?: string;
  modifyLabel?: string;
  dismissLabel?: string;
  escalateLabel?: string;
};

export function OverrideActionButtons({
  label = 'AI recommendation',
  onAccept,
  onModify,
  onDismiss,
  onEscalate,
  acceptLabel = 'Accept',
  modifyLabel = 'Modify',
  dismissLabel = 'Dismiss',
  escalateLabel = 'Escalate',
}: OverrideActionButtonsProps) {
  return (
    <div className="cd-ai-actions" aria-label={`${label} review actions`}>
      <button type="button" className="cd-ai-actions__button" onClick={onAccept}>
        <Check aria-hidden="true" size={14} />
        <span>{acceptLabel}</span>
      </button>
      <button type="button" className="cd-ai-actions__button" onClick={onModify}>
        <Pencil aria-hidden="true" size={14} />
        <span>{modifyLabel}</span>
      </button>
      <button type="button" className="cd-ai-actions__button" onClick={onDismiss}>
        <X aria-hidden="true" size={14} />
        <span>{dismissLabel}</span>
      </button>
      <button
        type="button"
        className="cd-ai-actions__button cd-ai-actions__button--escalate"
        onClick={onEscalate}
      >
        <Siren aria-hidden="true" size={14} />
        <span>{escalateLabel}</span>
      </button>
    </div>
  );
}
