import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InteractionInbox } from './InteractionInbox';
import { buildWorkflowAiCard, clearWorkflowAiCardsForTests } from '../../services/interactiveAi/workflowAiCards';
import { clearInboxCollaborationForTests } from '../../services/interactiveAi/inboxCollaboration';

afterEach(() => {
  clearWorkflowAiCardsForTests();
  clearInboxCollaborationForTests();
});

function seedCard() {
  return buildWorkflowAiCard({
    kind: 'unresolved_alert',
    summary: 'Alert needs review',
    channel: 'triage',
  })!;
}

describe('InteractionInbox — assign/comment UI (IX13)', () => {
  it('starts unassigned with zero comments, and "Assign to me" claims it', () => {
    seedCard();
    render(<InteractionInbox ownerRole="triage_nurse" ownerUserId="nurse-1" channel="triage" />);

    expect(screen.getByTestId('inbox-item-assignment')).toHaveTextContent('Unassigned');
    expect(screen.getByTestId('inbox-item-comments-toggle')).toHaveTextContent('0 comments');

    fireEvent.click(screen.getByTestId('inbox-item-assign-toggle'));

    expect(screen.getByTestId('inbox-item-assignment')).toHaveTextContent('Assigned to nurse-1');
    expect(screen.getByTestId('inbox-item-assign-toggle')).toHaveTextContent('Unassign');
  });

  it('clicking the assign toggle again releases the assignment', () => {
    seedCard();
    render(<InteractionInbox ownerRole="triage_nurse" ownerUserId="nurse-1" channel="triage" />);

    fireEvent.click(screen.getByTestId('inbox-item-assign-toggle'));
    expect(screen.getByTestId('inbox-item-assignment')).toHaveTextContent('Assigned to nurse-1');

    fireEvent.click(screen.getByTestId('inbox-item-assign-toggle'));
    expect(screen.getByTestId('inbox-item-assignment')).toHaveTextContent('Unassigned');
  });

  it('adding a comment updates the visible count and the thread, and clears the draft', () => {
    seedCard();
    render(<InteractionInbox ownerRole="triage_nurse" ownerUserId="nurse-1" channel="triage" />);

    fireEvent.click(screen.getByTestId('inbox-item-comments-toggle'));
    const input = screen.getByTestId('inbox-item-comment-input');
    fireEvent.change(input, { target: { value: 'Escalating to charge nurse' } });
    fireEvent.click(screen.getByTestId('inbox-item-comment-submit'));

    expect(screen.getByText('Escalating to charge nurse')).toBeInTheDocument();
    expect(input).toHaveValue('');

    fireEvent.click(screen.getByTestId('inbox-item-comments-toggle'));
    fireEvent.click(screen.getByTestId('inbox-item-comments-toggle'));
    expect(screen.getByTestId('inbox-item-comments-toggle')).toHaveTextContent('1 comment');
  });

  it('the comment submit button is disabled for a blank/whitespace-only draft', () => {
    seedCard();
    render(<InteractionInbox ownerRole="triage_nurse" ownerUserId="nurse-1" channel="triage" />);

    fireEvent.click(screen.getByTestId('inbox-item-comments-toggle'));
    const submit = screen.getByTestId('inbox-item-comment-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('inbox-item-comment-input'), { target: { value: '   ' } });
    expect(submit).toBeDisabled();
  });
});
