import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  hideCloseButton?: boolean;
  className?: string;
  children?: React.ReactNode;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};

export function Modal({ open, onClose, title, footer, size = 'md', hideCloseButton, className, children, ...aria }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap & Escape key
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      prev?.focus();
    };
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="cd-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={['cd-modal', `cd-modal--${size}`, className ?? ''].filter(Boolean).join(' ')}
        {...aria}
      >
        {(title || !hideCloseButton) && (
          <div className="cd-modal__header">
            {title && <h2 className="cd-modal__title">{title}</h2>}
            {!hideCloseButton && (
              <button
                type="button"
                className="cd-modal__close cd-btn cd-btn--ghost cd-btn--sm"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div className="cd-modal__body">{children}</div>
        {footer && <div className="cd-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
