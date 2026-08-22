import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InteractionInbox } from './InteractionInbox';
import { buildWorkflowAiCard, clearWorkflowAiCardsForTests } from '../../services/interactiveAi/workflowAiCards';
import { clearInboxCollaborationForTests } from '../../services/interactiveAi/inboxCollaboration';

// InteractionInbox's items now load asynchronously via the real
// action-proposal API -- mock it to resolve to no proposals so these tests
// (which only exercise workflow-card assign/comment UI) see just the seeded
// card, and don't hit the network.
vi.mock('../../services/interactiveAi/actionProposalApi', () => ({
  listActionProposalsApi: vi.fn(async () => []),
}));

afterEach(() => {
  clearWorkflowAiCardsForTests();
  clearInboxCollaborationForTests();
  vi.clearAllMocks();
});

function seedCard() {
  return buildWorkflowAiCard({
    kind: 'unresolved_alert',
    summary: 'Alert needs review',
    channel: 'triage',
  })!;
}

describe('InteractionInbox — assign/comment UI (IX13)', () => {
  it('starts unassigned with zero comments, and "Assign to me" claims it', async () => {
    seedCard();
    render(<InteractionInbox ownerRole="triage_nurse" ownerUserId="nurse-1" channel="triage" />);

    expect(await screen.findByTestId('inbox-item-assignment')).toHaveTextContent('Unassigned');
    expect(screen.getByTestId('inbox-item-comments-toggle')).toHaveTextContent('0 comments');

    fireEvent.click(screen.getByTestId('inbox-item-assign-toggle'));

    // Assign/comment mutate a local collaboration store directly, but the
    // combined item list (including the collaboration overlay) now comes
    // from an async refetch -- the UI catches up a tick after the click.
    await waitFor(() =>
      expect(screen.getByTestId('inbox-item-assignment')).toHaveTextContent('Assigned to nurse-1'),
    );
    expect(screen.getByTestId('inbox-item-assign-toggle')).toHaveTextContent('Unassign');
  });

  it('clicking the assign toggle again releases the assignment', async () => {
    seedCard();
    render(<InteractionInbox ownerRole="triage_nurse" ownerUserId="nurse-1" channel="triage" />);

    fireEvent.click(await screen.findByTestId('inbox-item-assign-toggle'));
    await waitFor(() =>
      expect(screen.getByTestId('inbox-item-assignment')).toHaveTextContent('Assigned to nurse-1'),
    );

    fireEvent.click(screen.getByTestId('inbox-item-assign-toggle'));
    await waitFor(() =>
      expect(screen.getByTestId('inbox-item-assignment')).toHaveTextContent('Unassigned'),
    );
  });

  it('adding a comment updates the visible count and the thread, and clears the draft', async () => {
    seedCard();
    render(<InteractionInbox ownerRole="triage_nurse" ownerUserId="nurse-1" channel="triage" />);

    fireEvent.click(await screen.findByTestId('inbox-item-comments-toggle'));
    const input = screen.getByTestId('inbox-item-comment-input');
    fireEvent.change(input, { target: { value: 'Escalating to charge nurse' } });
    fireEvent.click(screen.getByTestId('inbox-item-comment-submit'));

    expect(screen.getByText('Escalating to charge nurse')).toBeInTheDocument();
    expect(input).toHaveValue('');

    fireEvent.click(screen.getByTestId('inbox-item-comments-toggle'));
    fireEvent.click(screen.getByTestId('inbox-item-comments-toggle'));
    // The toggle button's own label carries item.commentCount, which comes
    // from the async-refetched item list, not the live comment-thread read.
    await waitFor(() =>
      expect(screen.getByTestId('inbox-item-comments-toggle')).toHaveTextContent('1 comment'),
    );
  });

  it('the comment submit button is disabled for a blank/whitespace-only draft', async () => {
    seedCard();
    render(<InteractionInbox ownerRole="triage_nurse" ownerUserId="nurse-1" channel="triage" />);

    fireEvent.click(await screen.findByTestId('inbox-item-comments-toggle'));
    const submit = screen.getByTestId('inbox-item-comment-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('inbox-item-comment-input'), { target: { value: '   ' } });
    expect(submit).toBeDisabled();
  });
});
