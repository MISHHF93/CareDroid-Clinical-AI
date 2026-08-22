import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AIActionProposal } from '../../contracts/interactiveAi';
import { buildWorkflowAiCard, clearWorkflowAiCardsForTests } from './workflowAiCards';
import { buildInteractionInbox, countOpenInboxItems } from './interactionInbox';
import {
  addInboxComment,
  assignInboxItem,
  clearInboxCollaborationForTests,
} from './inboxCollaboration';

const { listActionProposalsApi } = vi.hoisted(() => ({
  listActionProposalsApi: vi.fn(),
}));

vi.mock('./actionProposalApi', () => ({ listActionProposalsApi }));

function fakeProposal(overrides: Partial<AIActionProposal> = {}): AIActionProposal {
  return {
    proposalId: 'prop-1',
    originatingRequestId: 'r1',
    correlationId: 'c1',
    toolName: 'prepare_triage_handoff_draft',
    validatedArguments: {},
    expectedEffect: 'Draft',
    riskLevel: 'moderate',
    requiredPermission: 'use_ai_chat',
    requiresApproval: true,
    evidence: [],
    citations: [],
    model: 'local',
    promptVersion: '1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    rollbackCapable: false,
    state: 'proposed',
    previewSummary: 'Draft handoff',
    dataWillChange: ['draft'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerRole: 'triage_nurse',
    ...overrides,
  };
}

describe('interactionInbox', () => {
  afterEach(() => {
    clearWorkflowAiCardsForTests();
    clearInboxCollaborationForTests();
    vi.clearAllMocks();
  });

  it('aggregates open proposals and workflow cards sorted by urgency', async () => {
    listActionProposalsApi.mockResolvedValue([fakeProposal()]);
    buildWorkflowAiCard({
      kind: 'unresolved_alert',
      summary: 'Alert needs review',
      channel: 'triage',
    });

    const items = await buildInteractionInbox({ channel: 'triage', ownerRole: 'triage_nurse' });
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(await countOpenInboxItems({ channel: 'triage' })).toBeGreaterThan(0);
    expect(items[0].urgency === 'urgent' || items[0].urgency === 'attention').toBe(true);
  });

  it('surfaces collaboration state (assignment + comment count) on each item, defaulting to unassigned/zero', async () => {
    listActionProposalsApi.mockResolvedValue([]);
    const card = buildWorkflowAiCard({
      kind: 'unresolved_alert',
      summary: 'Alert needs review',
      channel: 'triage',
    })!;

    const [unassigned] = await buildInteractionInbox({ channel: 'triage' });
    expect(unassigned.assignedToUserId).toBeUndefined();
    expect(unassigned.commentCount).toBe(0);

    assignInboxItem(`card:${card.cardId}`, { userId: 'nurse-1' });
    addInboxComment(`card:${card.cardId}`, { authorRole: 'triage_nurse', body: 'Looking into this' });
    addInboxComment(`card:${card.cardId}`, { authorRole: 'triage_nurse', body: 'Escalated to charge' });

    const [collaborated] = await buildInteractionInbox({ channel: 'triage' });
    expect(collaborated.assignedToUserId).toBe('nurse-1');
    expect(collaborated.commentCount).toBe(2);
  });
});
