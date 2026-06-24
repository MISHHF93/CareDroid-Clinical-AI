import { describe, expect, it } from 'vitest';
import {
  formatPatientOrchestrationForCopilot,
  formatPatientToolRecommendationsForCopilot,
} from './formatOrchestrationPrompt';

describe('formatOrchestrationPrompt', () => {
  it('handles null orchestration context without throwing', () => {
    expect(formatPatientOrchestrationForCopilot(null)).toBe('');
    expect(formatPatientToolRecommendationsForCopilot(null)).toContain('No patient-specific tool recommendations');
  });

  it('handles partial orchestration context without recommendation arrays', () => {
    expect(
      formatPatientToolRecommendationsForCopilot({
        promptContext: 'Case context',
      } as never),
    ).toContain('No patient-specific tool recommendations');
  });
});