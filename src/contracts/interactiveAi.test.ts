import { describe, expect, it } from 'vitest';
import {
  canTransitionProposal,
  isTerminalProposalState,
  isTerminalStreamState,
  streamStateLabel,
} from './interactiveAi';

describe('interactiveAi contracts', () => {
  it('defines legal proposal transitions and terminal states', () => {
    expect(canTransitionProposal('proposed', 'approved')).toBe(true);
    expect(canTransitionProposal('proposed', 'completed')).toBe(false);
    expect(canTransitionProposal('completed', 'rolled_back')).toBe(true);
    expect(isTerminalProposalState('rejected')).toBe(true);
    expect(isTerminalProposalState('executing')).toBe(false);
  });

  it('labels stream states for accessible progress', () => {
    expect(streamStateLabel('retrieving_evidence')).toMatch(/evidence/i);
    expect(isTerminalStreamState('completed')).toBe(true);
    expect(isTerminalStreamState('preparing_response')).toBe(false);
  });
});
