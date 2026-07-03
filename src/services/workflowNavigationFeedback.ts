/**
 * Workflow handoff feedback — success toast with optional one-click navigation.
 */
import type { To } from 'react-router-dom';
import { STANDARD_ACTION_FEEDBACK } from '../config/careDroidInteractionModel';
import { showActionFeedback, showActionSuccess } from './careDroidInteractionFeedback';

export type WorkflowHandoffNotifyOptions = Readonly<{
  patientName?: string;
  description?: string;
  nextRoute?: string;
  onNavigate?: (route: To) => void;
  actionLabel?: string;
}>;

export function notifyWorkflowHandoffComplete(options: WorkflowHandoffNotifyOptions): void {
  const title = options.patientName
    ? `${options.patientName} routed`
    : STANDARD_ACTION_FEEDBACK.patientRouted;
  const description = options.description ?? STANDARD_ACTION_FEEDBACK.patientRouted;
  const nextRoute = options.nextRoute?.trim();
  const onNavigate = options.onNavigate;

  if (nextRoute && onNavigate) {
    showActionFeedback({
      tone: 'success',
      title,
      description,
      actionLabel: options.actionLabel ?? STANDARD_ACTION_FEEDBACK.continueToTriage,
      onAction: () => onNavigate(nextRoute),
    });
    return;
  }

  showActionSuccess(title, description);
}

export function notifyPatientStepAdvanced(
  patientName: string,
  stepLabel: string,
  options: { nextRoute?: string; onNavigate?: (route: To) => void } = {},
): void {
  const title = STANDARD_ACTION_FEEDBACK.patientAdvanced;
  const description = `${patientName} · ${stepLabel}`;

  if (options.nextRoute && options.onNavigate) {
    showActionFeedback({
      tone: 'success',
      title,
      description,
      actionLabel: STANDARD_ACTION_FEEDBACK.openNextStep,
      onAction: () => options.onNavigate?.(options.nextRoute as string),
    });
    return;
  }

  showActionSuccess(title, description);
}