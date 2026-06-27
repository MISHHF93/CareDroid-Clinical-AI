import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Drawer.css';

type DrawerSide = 'left' | 'right';
type DrawerSize = 'sm' | 'md' | 'lg' | 'full';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  className?: string;
  children?: React.ReactNode;
};

export function Drawer({ open, onClose, title, footer, side = 'right', size = 'md', className, children }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); prev?.focus(); };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="cd-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={['cd-drawer', `cd-drawer--${side}`, `cd-drawer--${size}`, className ?? ''].filter(Boolean).join(' ')}
      >
        <div className="cd-drawer__header">
          {title && <h2 className="cd-drawer__title">{title}</h2>}
          <button type="button" className="cd-btn cd-btn--ghost cd-btn--sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="cd-drawer__body">{children}</div>
        {footer && <div className="cd-drawer__footer">{footer}</div>}
      </div>
    </>,
    document.body,
  );
}
