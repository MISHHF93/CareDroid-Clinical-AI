import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ACTIVE_STREAM_PHASES,
  STREAM_PHASE_LABELS,
  TERMINAL_STREAM_PHASES,
} from '../../contracts/aiInteraction';
import { StreamingResponse } from './StreamingResponse';

describe('StreamingResponse', () => {
  it('names the current phase in a polite status region — never an anonymous spinner', () => {
    render(<StreamingResponse phase="retrieving_evidence" />);
    const status = screen.getByTestId('stream-phase');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Retrieving evidence');
  });

  it('renders a label for every phase in the contract', () => {
    for (const phase of [...ACTIVE_STREAM_PHASES, ...TERMINAL_STREAM_PHASES]) {
      const { unmount } = render(<StreamingResponse phase={phase} />);
      expect(screen.getByTestId('stream-phase')).toHaveTextContent(STREAM_PHASE_LABELS[phase]);
      unmount();
    }
  });

  it('offers cancel while active and hides it once terminal', () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <StreamingResponse phase="executing_tools" onCancel={onCancel} />,
    );
    screen.getByTestId('stream-cancel').click();
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(<StreamingResponse phase="completed" onCancel={onCancel} />);
    expect(screen.queryByTestId('stream-cancel')).toBeNull();
  });

  it('streamed text is rendered but is not a live region (no per-token announcements)', () => {
    render(<StreamingResponse phase="preparing_response" text="Partial answer so far" />);
    const text = screen.getByTestId('stream-text');
    expect(text).toHaveTextContent('Partial answer so far');
    expect(text).not.toHaveAttribute('aria-live');
    expect(text).not.toHaveAttribute('role');
  });

  it('shows the failure detail for terminal error states', () => {
    render(
      <StreamingResponse
        phase="blocked"
        errorMessage="Blocked by safety policy: autonomous triage is not permitted."
      />,
    );
    expect(screen.getByTestId('stream-phase')).toHaveTextContent('Blocked by safety policy');
    expect(screen.getByTestId('stream-detail')).toHaveTextContent(/autonomous triage/);
  });
});
