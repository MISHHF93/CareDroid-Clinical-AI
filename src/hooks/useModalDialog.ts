import { useEffect, type RefObject } from 'react';

/**
 * Canonical modal-dialog behaviour for CareDroid.
 *
 * The app had 26 handwritten overlays and only two of them contained a real focus
 * trap, while several still declared `aria-modal="true"` -- a promise to assistive
 * tech that focus is confined, made by markup that let Tab walk straight out onto
 * the patient board behind. The trap here is the one already proven in
 * PatientDetailPanel; this hook exists so the behaviour is written once and every
 * dialog inherits the same keyboard contract.
 *
 * Owns: Escape to close, Tab/Shift+Tab containment, initial focus, focus restore,
 * and optional background scroll lock. It deliberately does not own markup, so a
 * later move to a primitive library stays a component-level change.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type UseModalDialogOptions = {
  /** Invoked on Escape. Omit for a dialog that must be dismissed another way. */
  onClose?: () => void;
  /** Element to focus on open; falls back to the first focusable, then the container. */
  initialFocusSelector?: string;
  /** Prevents the page behind from scrolling while the dialog is open. */
  lockScroll?: boolean;
  /** Set false while the dialog is unmounted or inert. */
  enabled?: boolean;
};

export default function useModalDialog(
  containerRef: RefObject<HTMLElement | null>,
  { onClose, initialFocusSelector, lockScroll = true, enabled = true }: UseModalDialogOptions = {},
): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const explicitTarget = initialFocusSelector
      ? container.querySelector<HTMLElement>(initialFocusSelector)
      : null;
    const initialTarget = explicitTarget || getFocusable()[0] || container;
    if (initialTarget === container && !container.hasAttribute('tabindex')) {
      // A bare <div> cannot take focus, which would leave the caret in the page
      // behind and defeat the trap before it starts.
      container.setAttribute('tabindex', '-1');
    }
    initialTarget.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!onClose) return;
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    // Bound to document rather than the container so the trap still recaptures
    // focus that has already escaped the dialog.
    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = lockScroll ? document.body.style.overflow : '';
    if (lockScroll) document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (lockScroll) document.body.style.overflow = previousOverflow;
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [containerRef, enabled, initialFocusSelector, lockScroll, onClose]);
}
