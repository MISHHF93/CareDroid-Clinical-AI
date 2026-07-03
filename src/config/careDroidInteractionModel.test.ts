import { describe, expect, it } from 'vitest';
import {
  CARE_DROID_INTERACTION,
  INTERACTION_SHORTCUTS,
  STANDARD_ACTION_FEEDBACK,
} from './careDroidInteractionModel';

describe('careDroidInteractionModel', () => {
  it('defines consistent feedback timing', () => {
    expect(CARE_DROID_INTERACTION.feedbackDurationMs).toBeGreaterThan(1000);
    expect(CARE_DROID_INTERACTION.loadingMinVisibleMs).toBeGreaterThan(0);
  });

  it('documents global keyboard affordances', () => {
    expect(INTERACTION_SHORTCUTS.commandPalette).toBe('Ctrl+K');
    expect(INTERACTION_SHORTCUTS.dismissOverlay).toBe('Escape');
  });

  it('defines standard feedback copy for cross-surface actions', () => {
    expect(STANDARD_ACTION_FEEDBACK.continueToTriage).toBe('Continue to triage');
    expect(STANDARD_ACTION_FEEDBACK.reassigned('Alex', 'Dr. Kim')).toContain('Alex');
  });
});