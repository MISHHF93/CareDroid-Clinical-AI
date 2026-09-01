import { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useModalDialog from './useModalDialog';

function Dialog({ onClose, lockScroll = true }: { onClose?: () => void; lockScroll?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useModalDialog(ref, { onClose, lockScroll });
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Score">
      <button type="button">Close</button>
      <input aria-label="Value" />
      <button type="button">Save</button>
    </div>
  );
}

function ContainerFocusDialog() {
  const ref = useRef<HTMLDivElement>(null);
  useModalDialog(ref, { initialFocus: 'container' });
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Reassessment">
      <button type="button">Close</button>
      <button type="button">Save</button>
    </div>
  );
}

function Harness({ open, onClose }: { open: boolean; onClose?: () => void }) {
  return (
    <>
      <button type="button">Behind the dialog</button>
      {open ? <Dialog onClose={onClose} /> : null}
    </>
  );
}

afterEach(() => {
  document.body.style.overflow = '';
});

describe('useModalDialog', () => {
  it('moves focus into the dialog when it opens', () => {
    render(<Dialog />);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('wraps Tab from the last focusable back to the first', async () => {
    const user = userEvent.setup();
    render(<Dialog />);

    screen.getByRole('button', { name: 'Save' }).focus();
    await user.tab();

    // Without the trap this lands on the browser chrome or the page behind.
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('wraps Shift+Tab from the first focusable to the last', async () => {
    const user = userEvent.setup();
    render(<Dialog />);

    screen.getByRole('button', { name: 'Close' }).focus();
    await user.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('wraps Shift+Tab when focus is still on the dialog container', async () => {
    const user = userEvent.setup();
    render(<ContainerFocusDialog />);

    // initialFocus 'container' leaves the caret on the dialog itself, which is
    // neither the first focusable nor outside the dialog. A real browser walked
    // backwards out of the dialog from here.
    expect(screen.getByRole('dialog')).toHaveFocus();
    await user.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to whatever opened it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness open={false} />);

    const trigger = screen.getByRole('button', { name: 'Behind the dialog' });
    trigger.focus();

    rerender(<Harness open />);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    rerender(<Harness open={false} />);
    await Promise.resolve();
    expect(trigger).toHaveFocus();
    void user;
  });

  it('locks background scroll while open and restores it on close', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = render(<Dialog />);

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('leaves scrolling alone when lockScroll is false', () => {
    document.body.style.overflow = 'auto';
    render(<Dialog lockScroll={false} />);

    expect(document.body.style.overflow).toBe('auto');
  });
});
