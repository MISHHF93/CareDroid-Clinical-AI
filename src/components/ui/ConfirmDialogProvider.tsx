import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, pending]);

  return (
    <>
      {children}
      {pending ? (
        <div className="cd-confirm-dialog-overlay" role="presentation" onClick={() => close(false)}>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- onClick only stops propagation to the backdrop's close handler, it is not an interactive control itself */}
          <div
            className={`cd-confirm-dialog cd-confirm-dialog--${pending.tone || 'default'}`}
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