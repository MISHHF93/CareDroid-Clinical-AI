import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockGlobalScroll } from '../../utils/scrollLock';
import './Modal.css';

/** * Base Modal Component
 * 
 * Accessible modal dialog with focus trap and keyboard support
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Function} onClose - Callback when modal should close
 * @param {string} title - Modal title
 * @param {ReactNode} children - Modal content
 * @param {ReactNode} footer - Optional footer content (buttons, etc.)
 * @param {('sm'|'md'|'lg'|'xl'|'full')} size - Modal width
 * @param {boolean} closeOnEscape - Close on Esc key (default true)
 * @param {boolean} closeOnOverlay - Close on overlay click (default true)
 * @param {string} className - Additional CSS classes
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnEscape = true,
  closeOnOverlay = true,
  className = '',
  ...props
}) => {
  const modalRef = useRef(null);
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
      // Store the currently focused element
      previousFocusRef.current = document.activeElement;
      
      // Focus the modal
      setTimeout(() => {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 10);

      // Prevent background scroll without clobbering another active overlay.
      const releaseScrollLock = lockGlobalScroll();
      return () => {
        releaseScrollLock();
      };
    } else {
      // Restore focus to previous element
      previousFocusRef.current?.focus();
    }
    return undefined;
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
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`modal modal-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        {...props}
      >
        <div className="modal-header">
          {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/**
 * Confirmation Dialog
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default', // 'default' | 'danger'
  isLoading = false,
  ...props
}) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="confirm-dialog-actions">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={isLoading}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      }
      {...props}
    >
      <p className="confirm-dialog-message">{message}</p>
    </Modal>
  );
};

/**
 * Alert Dialog (info only, single button)
 */
export const AlertDialog = ({
  isOpen,
  onClose,
  title = 'Notice',
  message,
  buttonText = 'OK',
  ...props
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <button
          className="btn-primary"
          onClick={onClose}
          type="button"
        >
          {buttonText}
        </button>
      }
      {...props}
    >
      <p className="alert-dialog-message">{message}</p>
    </Modal>
  );
};
