import { useEffect, useRef } from 'react';
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
  footer,
  size = 'md',
  closeOnEscape = true,
  closeOnOverlay = true,
  className = '',
  ...props
}) => {
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      
      setTimeout(() => {
        const focusableElements = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 10);

      document.body.style.overflow = 'hidden';
    } else {
      previousFocusRef.current?.focus();
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
          {title && <h2 id="drawer-title" className="drawer-title">{title}</h2>}
          <button
            className="drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {children}
        </div>

        {footer && (
          <div className="drawer-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/**
 * Mobile Navigation Drawer (left). Distinct name from route-level mobile nav components.
 */
export const DrawerMobileNav = ({ isOpen, onClose, children }) => {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      size="md"
      title="Menu"
    >
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
