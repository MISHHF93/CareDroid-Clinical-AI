import { useRef } from 'react';
import useModalDialog from '../../hooks/useModalDialog';
import { createPortal } from 'react-dom';
import './Drawer.css';

/**
 * Drawer (Side Panel) Component
 *
 * Slides in from the side, useful for mobile navigation and detail panels
 * @param {boolean} isOpen - Whether drawer is visible
 * @param {Function} onClose - Callback when drawer should close
 * @param {('left'|'right'|'top'|'bottom')} side - Which side to slide from
 * @param {string} title - Optional drawer title
 * @param {ReactNode} children - Drawer content
 * @param {ReactNode} footer - Optional footer content
 * @param {('sm'|'md'|'lg'|'full')} size - Drawer width/height
 * @param {boolean} closeOnEscape - Close on Esc key (default true)
 * @param {boolean} closeOnOverlay - Close on overlay click (default true)
 * @param {string} className - Additional CSS classes
 */
export const Drawer = ({
  isOpen,
  onClose,
  side = 'right',
  title,
  children,
  footer = undefined as any,
  size = 'md',
  closeOnEscape = true,
  closeOnOverlay = true,
  className = '',
  ...props
}: any) => {
  const drawerRef = useRef<any>(null);

  // Escape, initial focus, focus restore and scroll lock were all hand-rolled here
  // -- correctly, except for the one thing aria-modal="true" below actually
  // promises: Tab was never contained, so focus walked out of the drawer onto the
  // page behind it. The shared hook owns all five. It also removes a setTimeout(10)
  // that raced the drawer's own mount to place initial focus.
  //
  // closeOnEscape is preserved by passing no onClose: the hook only binds Escape
  // when it has something to call.
  useModalDialog(drawerRef, {
    onClose: closeOnEscape ? onClose : undefined,
    enabled: isOpen,
  });

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`drawer-overlay ${isOpen ? 'drawer-overlay-open' : ''}`}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={drawerRef}
        className={`drawer drawer-${side} drawer-${size} ${isOpen ? 'drawer-open' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        {...props}
      >
        <div className="drawer-header">
          {title && (
            <h2 id="drawer-title" className="drawer-title">
              {title}
            </h2>
          )}
          <button
            className="drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">{children}</div>

        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

/**
 * Drawer menu shell (left).
 */
export const DrawerMenuPanel = ({ isOpen, onClose, children }) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} side="left" size="md" title="Menu">
      {children}
    </Drawer>
  );
};

/**
 * Filter Panel Drawer
 */
export const FilterDrawer = ({ isOpen, onClose, onApply, children }) => {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      size="md"
      title="Filters"
      footer={
        <div className="drawer-actions">
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn-primary" onClick={onApply} type="button">
            Apply Filters
          </button>
        </div>
      }
    >
      {children}
    </Drawer>
  );
};
