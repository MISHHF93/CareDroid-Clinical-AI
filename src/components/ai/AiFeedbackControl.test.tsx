import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiFeedbackControl from './AiFeedbackControl';
import * as aiFeedbackApi from '../../services/aiFeedbackApi';

describe('AiFeedbackControl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when there is no runId to correlate feedback to', () => {
    const { container } = render(<AiFeedbackControl runId={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('submits HELPFUL directly and shows a confirmation', async () => {
    const spy = vi.spyOn(aiFeedbackApi, 'submitAiFeedback').mockResolvedValue({ ok: true, message: '' });

    render(<AiFeedbackControl runId="run-1" capabilityId="clinical-chat" />);
    await userEvent.click(screen.getByRole('button', { name: 'Helpful' }));

    expect(spy).toHaveBeenCalledWith({
      runId: 'run-1',
      capabilityId: 'clinical-chat',
      rating: 'HELPFUL',
      comment: undefined,
    });
    expect(await screen.findByText(/thanks for the feedback/i)).toBeInTheDocument();
  });

  it('reveals refinement categories on "not helpful" rather than submitting immediately', async () => {
    const spy = vi.spyOn(aiFeedbackApi, 'submitAiFeedback').mockResolvedValue({ ok: true, message: '' });

    render(<AiFeedbackControl runId="run-1" />);
    await userEvent.click(screen.getByRole('button', { name: /not helpful/i }));

    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Incorrect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unsafe concern' })).toBeInTheDocument();
  });

  it('submits a specific refinement rating (e.g. UNSAFE_CONCERN) when chosen', async () => {
    const spy = vi.spyOn(aiFeedbackApi, 'submitAiFeedback').mockResolvedValue({ ok: true, message: '' });

    render(<AiFeedbackControl runId="run-1" />);
    await userEvent.click(screen.getByRole('button', { name: /not helpful/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Unsafe concern' }));

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run-1', rating: 'UNSAFE_CONCERN' }),
    );
    expect(await screen.findByText(/thanks for the feedback/i)).toBeInTheDocument();
  });

  it('lets the user add an optional comment before submitting "Other"', async () => {
    const spy = vi.spyOn(aiFeedbackApi, 'submitAiFeedback').mockResolvedValue({ ok: true, message: '' });

    render(<AiFeedbackControl runId="run-1" />);
    await userEvent.click(screen.getByRole('button', { name: /not helpful/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Other' }));

    const textarea = screen.getByLabelText(/what went wrong/i);
    await userEvent.type(textarea, 'Cited a protocol that does not exist.');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        rating: 'OTHER',
        comment: 'Cited a protocol that does not exist.',
      }),
    );
    expect(await screen.findByText(/thanks for the feedback/i)).toBeInTheDocument();
  });
});
