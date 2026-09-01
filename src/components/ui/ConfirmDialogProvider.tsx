import { useCallback, useEffect, useRef, useState } from 'react';
import useModalDialog from '../../hooks/useModalDialog';
import Button from './button';
import { registerConfirmDialogHandler } from '../../services/careDroidInteractionFeedback';
import type { ConfirmActionOptions } from '../../config/careDroidInteractionModel';
import './ConfirmDialogProvider.css';

type PendingConfirm = ConfirmActionOptions & {
  resolve: (confirmed: boolean) => void;
};

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const close = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  useEffect(() => {
    return registerConfirmDialogHandler((options, resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const dialogRef = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => close(false), [close]);

  // Escape was already handled here; focus containment, focus restore and scroll
  // lock were not, on the app's canonical destructive-action confirm. The shared
  // hook owns all four so this dialog cannot drift from the rest again.
  useModalDialog(dialogRef, {
    onClose: dismiss,
    enabled: Boolean(pending),
    // The WAI-ARIA alertdialog pattern puts focus on the safe action.
    initialFocusSelector: '.cd-confirm-dialog__actions button',
  });

  return (
    <>
      {children}
      {pending ? (
        <div className="cd-confirm-dialog-overlay" role="presentation" onClick={() => close(false)}>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- onClick only stops propagation to the backdrop's close handler, it is not an interactive control itself */}
          <div
            className={`cd-confirm-dialog cd-confirm-dialog--${pending.tone || 'default'}`}
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cd-confirm-dialog-title"
            aria-describedby="cd-confirm-dialog-message"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="cd-confirm-dialog-title" className="cd-confirm-dialog__title">
              {pending.title}
            </h2>
            <p id="cd-confirm-dialog-message" className="cd-confirm-dialog__message">
              {pending.message}
            </p>
            <div className="cd-confirm-dialog__actions">
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- deliberate WAI-ARIA alertdialog pattern: move focus to the safe/cancel action when the dialog opens */}
              <Button type="button" variant="secondary" autoFocus onClick={() => close(false)}>
                {pending.cancelLabel || 'Cancel'}
              </Button>
              <Button
                type="button"
                variant={pending.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
              >
                {pending.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}