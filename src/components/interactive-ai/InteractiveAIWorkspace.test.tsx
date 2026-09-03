/* eslint-disable jsx-a11y/aria-role -- `role` here is InteractiveAIWorkspace's own user-role prop (e.g. "reception-lead"), not a DOM ARIA role attribute; the rule can't tell literal-string component props apart from native elements. */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InteractiveAIWorkspace } from './InteractiveAIWorkspace';
import { CANONICAL_ROUTES } from '../../config/routes.config';

// InteractiveAIWorkspace now calls the real backend-backed action-proposal API
// (actionProposalApi.ts) instead of an in-memory mock. This is a small
// stateful fake mirroring the real backend's create -> approve -> execute
// contract closely enough for these integration-style tests, without hitting
// the network.
const { store, listActionProposalsApi } = vi.hoisted(() => ({
  store: new Map<string, any>(),
  listActionProposalsApi: vi.fn(async () => []),
}));

vi.mock('../../services/interactiveAi/actionProposalApi', () => ({
  createActionProposalApi: vi.fn(async (input: any) => {
    const proposal = {
      ...input,
      proposalId: `test-proposal-${store.size + 1}`,
      evidence: [],
      citations: [],
      state: 'proposed',
      requiresApproval: input.requiresApproval ?? true,
      rollbackCapable: Boolean(input.rollbackCapable),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    store.set(proposal.proposalId, proposal);
    return proposal;
  }),
  getActionProposalApi: vi.fn(async (proposalId: string) => store.get(proposalId) ?? null),
  approveProposalApi: vi.fn(async (proposalId: string) => {
    const next = {
      ...store.get(proposalId),
      state: 'approved',
      updatedAt: new Date().toISOString(),
    };
    store.set(proposalId, next);
    return next;
  }),
  rejectProposalApi: vi.fn(async (proposalId: string, reason: string) => {
    const next = {
      ...store.get(proposalId),
      state: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    };
    store.set(proposalId, next);
    return next;
  }),
  executeProposalApi: vi.fn(async (proposalId: string, result: Record<string, unknown>) => {
    const next = {
      ...store.get(proposalId),
      state: 'completed',
      executionResult: result,
      updatedAt: new Date().toISOString(),
    };
    store.set(proposalId, next);
    return next;
  }),
  rollbackProposalApi: vi.fn(async (proposalId: string) => {
    const next = {
      ...store.get(proposalId),
      state: 'rolled_back',
      updatedAt: new Date().toISOString(),
    };
    store.set(proposalId, next);
    return next;
  }),
  listActionProposalsApi,
}));

function renderWorkspace(
  ui: React.ReactElement,
  initialPath = CANONICAL_ROUTES.emergencyReception,
) {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}

afterEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe('InteractiveAIWorkspace', () => {
  it('picks a channel-appropriate heading when no title override is given', () => {
    renderWorkspace(<InteractiveAIWorkspace role="reception-lead" channel="reception" />);
    expect(screen.getByRole('heading', { name: /reception copilot/i })).toBeInTheDocument();
  });

  it('falls back to the generic CareDroid Assist heading for an unrecognized channel', () => {
    renderWorkspace(<InteractiveAIWorkspace role="physician" channel="whiteboard" />);
    expect(screen.getByRole('heading', { name: /caredroid assist/i })).toBeInTheDocument();
  });

  it('renders context chips for the channel, role, and an attached patient, humanized rather than raw enum values', () => {
    renderWorkspace(
      <InteractiveAIWorkspace role="charge-nurse" channel="ems" patientId="patient-42" />,
    );
    const contextBar = screen.getByTestId('interactive-context-bar');
    expect(contextBar).toHaveTextContent('Channel: EMS');
    expect(contextBar).toHaveTextContent('Role: Charge Nurse');
    expect(contextBar).toHaveTextContent('Patient: patient-42');
  });

  it('toggles the inbox visibility and its pressed state when the Inbox button is clicked', async () => {
    const user = userEvent.setup();
    renderWorkspace(<InteractiveAIWorkspace role="reception-lead" channel="reception" />);
    const inboxButton = screen.getByRole('button', { name: 'Inbox' });
    expect(inboxButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(inboxButton);
    expect(inboxButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('lets the user type into the composer and enables Send once there is input', async () => {
    const user = userEvent.setup();
    renderWorkspace(<InteractiveAIWorkspace role="reception-lead" channel="reception" />);
    const textarea = screen.getByLabelText('Assist message');
    const sendButton = screen.getByRole('button', { name: 'Send' });
    expect(sendButton).toBeDisabled();

    await user.type(textarea, 'Where is bed 4?');
    expect(sendButton).not.toBeDisabled();
  });

  it('turns an open-reception prompt into a navigation proposal with Open action', async () => {
    const user = userEvent.setup();
    renderWorkspace(
      <InteractiveAIWorkspace
        role="registration_clerk"
        channel="reception"
        permissions={['use_ai_chat', 'view_phi', 'view_operations']}
      />,
    );

    const textarea = screen.getByLabelText('Assist message');
    await user.type(textarea, 'Open reception desk');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByTestId('action-proposal-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('action-proposal-card')).toHaveTextContent(/reception/i);
    expect(screen.getByTestId('action-proposal-approve')).toHaveTextContent(/^Open$/i);
  });

  it('dispatches reception panel event when Open is confirmed for lookup', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    document.addEventListener('open-reception-lookup', handler);

    renderWorkspace(
      <InteractiveAIWorkspace
        role="registration_clerk"
        channel="reception"
        permissions={['use_ai_chat', 'view_phi', 'view_operations']}
      />,
      CANONICAL_ROUTES.emergencyReception,
    );

    await user.type(screen.getByLabelText('Assist message'), 'focus patient lookup');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByTestId('action-proposal-approve')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('action-proposal-approve'));

    await waitFor(() => {
      expect(handler).toHaveBeenCalled();
    });

    document.removeEventListener('open-reception-lookup', handler);
  });
});
