/**
 * Canonical interaction contract — feedback timing, confirmation copy, and keyboard affordances.
 */
export const CARE_DROID_INTERACTION = Object.freeze({
  feedbackDurationMs: 2800,
  confirmDangerDurationMs: 4200,
  loadingMinVisibleMs: 320,
  liveRegionPoliteness: 'polite' as const,
  assertivePoliteness: 'assertive' as const,
});

export type ActionFeedbackTone = 'success' | 'error' | 'info' | 'warning' | 'loading';

export type ActionFeedbackOptions = Readonly<{
  tone?: ActionFeedbackTone;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}>;

export type ConfirmActionOptions = Readonly<{
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}>;

export const INTERACTION_SHORTCUTS = Object.freeze({
  commandPalette: 'Ctrl+K',
  dismissOverlay: 'Escape',
  submitForm: 'Enter',
  globalHelp: 'Shift+?',
});

export const CONTEXTUAL_GUIDANCE_DISMISS_KEY = 'caredroid.guidance.dismissed';

/** Standard copy for consistent feedback across profiles and surfaces. */
export const STANDARD_ACTION_FEEDBACK = Object.freeze({
  patientRouted: 'Patient routed to triage',
  patientAdvanced: 'Patient advanced to next step',
  draftSaved: 'Draft saved locally',
  actionFailed: 'Action failed',
  continueToTriage: 'Continue to triage',
  openNextStep: 'Open next step',
  reassigned: (patientName: string, staffName: string) =>
    `${patientName} reassigned to ${staffName}`,
});
