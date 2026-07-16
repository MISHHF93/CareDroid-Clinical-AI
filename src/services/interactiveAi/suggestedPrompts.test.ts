import { describe, expect, it } from 'vitest';
import { getSuggestedPrompts, listApprovedSuggestionTemplates } from './suggestedPrompts';

describe('suggestedPrompts', () => {
  it('returns only approved templates for reception', () => {
    const prompts = getSuggestedPrompts({
      channel: 'reception',
      role: 'registration_clerk',
      missingRegistrationFields: ['insurance'],
      hasOcrJob: true,
    });
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.every((p) => listApprovedSuggestionTemplates().some((t) => t.id === p.id))).toBe(
      true,
    );
    expect(prompts.some((p) => p.templateId === 'reception.missing_registration')).toBe(true);
  });

  it('includes EMS templates for ems channel', () => {
    const prompts = getSuggestedPrompts({
      channel: 'ems',
      role: 'paramedic',
      hasEmsArrival: true,
    });
    expect(prompts.some((p) => p.templateId.startsWith('ems.'))).toBe(true);
  });
});
