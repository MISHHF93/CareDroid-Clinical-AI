import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createActionProposal, transitionProposal } from '../../contracts/aiInteraction';
import { ActionProposalCard } from './ActionProposalCard';

const fixedNow = () => new Date('2026-07-16T12:00:00.000Z');

function proposal(overrides: Partial<Parameters<typeof createActionProposal>[0]> = {}) {
  return createActionProposal({
    proposalId: 'prop-ui-1',
    originatingRequestId: 'req-ui-1',
    toolName: 'flag_patient',
    validatedArguments: { patientId: 'P-1', flag: 'reassess' },
    expectedEffect: 'Flags patient P-1 for reassessment.',
    riskLevel: 'moderate',
    modelVersion: 'claude-sonnet-4-6',
    promptVersion: 'ed-copilot@1.0.0',
    now: fixedNow,
    ...overrides,
  });
}

describe('ActionProposalCard', () => {
  it('previews the exact operation, risk, reversibility, and provenance', () => {
    render(<ActionProposalCard proposal={proposal()} patientName="Jordan Rivera" now={fixedNow} />);

    expect(screen.getByTestId('proposal-effect')).toHaveTextContent(
      /Flags patient P-1 for reassessment.*Jordan Rivera/,
    );
    expect(screen.getByTestId('proposal-arguments')).toHaveTextContent('"patientId": "P-1"');
    expect(screen.getByTestId('proposal-risk')).toHaveTextContent(/moderate risk/i);
    expect(screen.getByTestId('proposal-rollback')).toHaveTextContent(/Not automatically reversible/);
    expect(screen.getByText(/Model: claude-sonnet-4-6/)).toBeInTheDocument();
    expect(screen.getByText(/Prompt: ed-copilot@1.0.0/)).toBeInTheDocument();
    expect(screen.getByTestId('proposal-expiry')).toHaveTextContent(/Approval window closes/);
  });

  it('fires approve and reject callbacks while actionable', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ActionProposalCard
        proposal={proposal()}
        onApprove={onApprove}
        onReject={onReject}
        now={fixedNow}
      />,
    );

    screen.getByTestId('proposal-approve').click();
    screen.getByTestId('proposal-reject').click();
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('names the required permission on the approve control', () => {
    render(
      <ActionProposalCard
        proposal={proposal({ requiredPermission: 'WRITE_PHI' })}
        now={fixedNow}
      />,
    );
    expect(screen.getByTestId('proposal-approve')).toHaveTextContent(/requires WRITE_PHI/);
  });

  it('an expired proposal disables actions and says so', () => {
    const afterExpiry = () => new Date('2026-07-16T12:30:00.000Z');
    render(<ActionProposalCard proposal={proposal()} now={afterExpiry} />);

    expect(screen.queryByTestId('proposal-approve')).toBeNull();
    expect(screen.getByTestId('proposal-state')).toHaveTextContent(/expired/i);
    expect(screen.getByTestId('proposal-closed')).toHaveTextContent(/expired before a decision/);
  });

  it('terminal proposals show the outcome and the full audit trail', () => {
    let done = proposal();
    done = transitionProposal(done, 'approved', 'charge-nurse-7', undefined, fixedNow);
    done = transitionProposal(done, 'executing', 'system', undefined, fixedNow);
    done = transitionProposal(done, 'failed', 'system', 'Patient P-1 was not found.', fixedNow);

    render(<ActionProposalCard proposal={done} now={fixedNow} />);

    expect(screen.getByTestId('proposal-state')).toHaveTextContent('failed');
    expect(screen.queryByTestId('proposal-approve')).toBeNull();
    expect(screen.getByTestId('proposal-closed')).toHaveTextContent(/proposal is failed/);
    const history = screen.getByTestId('proposal-history');
    expect(history).toHaveTextContent('proposed → approved by charge-nurse-7');
    expect(history).toHaveTextContent('executing → failed by system — Patient P-1 was not found.');
  });

  it('flags session-only proposals that have no authoritative record', () => {
    render(<ActionProposalCard proposal={proposal()} sessionOnly now={fixedNow} />);
    expect(screen.getByTestId('proposal-session-only')).toHaveTextContent(/session only/i);
  });

  it('busy state suspends actions without pretending an outcome', () => {
    render(<ActionProposalCard proposal={proposal()} busy now={fixedNow} />);
    expect(screen.queryByTestId('proposal-approve')).toBeNull();
    expect(screen.getByTestId('proposal-closed')).toHaveTextContent(/Working/);
  });
});
