import { afterEach, describe, expect, it } from 'vitest';
import {
  clearActionProposalStoreForTests,
  createActionProposal,
} from './actionProposalService';
import { buildWorkflowAiCard, clearWorkflowAiCardsForTests } from './workflowAiCards';
import { buildInteractionInbox, countOpenInboxItems } from './interactionInbox';

describe('interactionInbox', () => {
  afterEach(() => {
    clearActionProposalStoreForTests();
    clearWorkflowAiCardsForTests();
  });

  it('aggregates open proposals and workflow cards sorted by urgency', () => {
    createActionProposal({
      originatingRequestId: 'r1',
      correlationId: 'c1',
      toolName: 'prepare_triage_handoff_draft',
      validatedArguments: {},
      expectedEffect: 'Draft',
      riskLevel: 'moderate',
      requiredPermission: 'use_ai_chat',
      model: 'local',
      promptVersion: '1',
      previewSummary: 'Draft handoff',
      dataWillChange: ['draft'],
      ownerRole: 'triage_nurse',
    });
    buildWorkflowAiCard({
      kind: 'unresolved_alert',
      summary: 'Alert needs review',
      channel: 'triage',
    });

    const items = buildInteractionInbox({ channel: 'triage', ownerRole: 'triage_nurse' });
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(countOpenInboxItems({ channel: 'triage' })).toBeGreaterThan(0);
    expect(items[0].urgency === 'urgent' || items[0].urgency === 'attention').toBe(true);
  });
});
