import { useEffect, useRef } from 'react';
import { lockGlobalScroll } from '../utils/scrollLock';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isFocusableVisible(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('inert')) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  return el.getClientRects().length > 0;
}

/**
 * Focus trap, body scroll lock, and focus restore for mobile navigation drawers.
 * @param {{ isOpen: boolean, containerRef: import('react').RefObject<HTMLElement|null>, restoreFocusRef?: import('react').RefObject<HTMLElement|null> }} options
 */
export function useDrawerFocus({ isOpen, containerRef, restoreFocusRef }) {
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const releaseScrollLock = lockGlobalScroll();

    const container = containerRef.current;
    const focusFirst = () => {
      const initial = container?.querySelector('[data-drawer-initial-focus]');
      const nodes = container?.querySelectorAll(FOCUSABLE_SELECTOR);
      const firstVisible = [...(nodes ?? [])].find(isFocusableVisible);
      (initial ?? firstVisible)?.focus();
    };
    const focusTimer = window.setTimeout(focusFirst, 0);

    const onKeyDown = (event) => {
      if (event.key !== 'Tab' || !container) return;
      const focusable = [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(isFocusableVisible);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      releaseScrollLock();
      const restore = restoreFocusRef?.current ?? previousFocusRef.current;
      restore?.focus?.();
    };
  }, [isOpen, containerRef, restoreFocusRef]);
}
