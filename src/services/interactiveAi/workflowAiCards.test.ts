import { afterEach, describe, expect, it } from 'vitest';
import {
  acknowledgeWorkflowCard,
  buildWorkflowAiCard,
  clearWorkflowAiCardsForTests,
  dismissWorkflowCard,
  listWorkflowAiCards,
} from './workflowAiCards';

describe('workflowAiCards', () => {
  afterEach(() => {
    clearWorkflowAiCardsForTests();
  });

  it('builds deduplicated permissioned cards for EMS pre-arrival', () => {
    const first = buildWorkflowAiCard({
      kind: 'ems_prearrival',
      patientId: 'p1',
      summary: 'Unit 12 inbound',
    });
    const second = buildWorkflowAiCard({
      kind: 'ems_prearrival',
      patientId: 'p1',
      summary: 'Unit 12 inbound',
    });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(first?.channel).toBe('ems');
    expect(first?.recommendedActions.some((a) => a.requiresApproval)).toBe(true);
  });

  it('lists active cards and supports acknowledge/dismiss', () => {
    const card = buildWorkflowAiCard({ kind: 'incomplete_registration', patientId: 'p2' });
    expect(card).not.toBeNull();
    expect(listWorkflowAiCards({ channel: 'reception' }).length).toBe(1);
    acknowledgeWorkflowCard(card!.cardId);
    dismissWorkflowCard(card!.cardId);
    expect(listWorkflowAiCards({ channel: 'reception' }).length).toBe(0);
    expect(listWorkflowAiCards({ channel: 'reception', includeDismissed: true }).length).toBe(1);
  });
});
