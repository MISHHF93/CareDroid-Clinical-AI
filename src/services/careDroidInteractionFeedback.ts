/**
 * Unified user-action feedback — Sonner toasts with CDL timing; operational alerts stay separate.
 */
import { toast } from 'sonner';
import {
  CARE_DROID_INTERACTION,
  type ActionFeedbackOptions,
  type ActionFeedbackTone,
  type ConfirmActionOptions,
} from '../config/careDroidInteractionModel';

type ConfirmResolver = (confirmed: boolean) => void;

let confirmRequestHandler: ((options: ConfirmActionOptions, resolve: ConfirmResolver) => void) | null =
  null;

export function registerConfirmDialogHandler(
  handler: (options: ConfirmActionOptions, resolve: ConfirmResolver) => void,
): () => void {
  confirmRequestHandler = handler;
  return () => {
    if (confirmRequestHandler === handler) {
      confirmRequestHandler = null;
    }
  };
}

function toneToSonner(tone: ActionFeedbackTone): 'success' | 'error' | 'info' | 'warning' | 'loading' {
  return tone;
}

export function showActionFeedback(options: ActionFeedbackOptions): string | number {
  const tone = options.tone || 'info';
  const duration = options.durationMs ?? CARE_DROID_INTERACTION.feedbackDurationMs;
  const toastFn = toast[toneToSonner(tone)] ?? toast;

  return toastFn(options.title, {
    description: options.description,
    duration: tone === 'loading' ? Infinity : duration,
    action:
      options.actionLabel && options.onAction
        ? { label: options.actionLabel, onClick: options.onAction }
        : undefined,
  });
}

export function showActionSuccess(title: string, description?: string): string | number {
  return showActionFeedback({ tone: 'success', title, description });
}

export function showActionError(title: string, description?: string): string | number {
  return showActionFeedback({
    tone: 'error',
    title,
    description,
    durationMs: CARE_DROID_INTERACTION.confirmDangerDurationMs,
  });
}

export function showActionInfo(title: string, description?: string): string | number {
  return showActionFeedback({ tone: 'info', title, description });
}

export function dismissActionFeedback(id?: string | number): void {
  if (id !== undefined) {
    toast.dismiss(id);
    return;
  }
  toast.dismiss();
}

export function confirmCareDroidAction(options: ConfirmActionOptions): Promise<boolean> {
  if (!confirmRequestHandler) {
    return Promise.resolve(window.confirm(`${options.title}\n\n${options.message}`));
  }
  return new Promise((resolve) => {
    confirmRequestHandler?.(options, resolve);
  });
}

export async function runWithActionFeedback<T>(
  task: () => Promise<T>,
  messages: Readonly<{
    loading?: string;
    success: string;
    error?: string;
  }>,
): Promise<T> {
  const loadingId = messages.loading
    ? showActionFeedback({ tone: 'loading', title: messages.loading })
    : undefined;
  const started = Date.now();

  try {
    const result = await task();
    if (loadingId !== undefined) {
      const elapsed = Date.now() - started;
      if (elapsed < CARE_DROID_INTERACTION.loadingMinVisibleMs) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, CARE_DROID_INTERACTION.loadingMinVisibleMs - elapsed),
        );
      }
      dismissActionFeedback(loadingId);
    }
    showActionSuccess(messages.success);
    return result;
  } catch (error) {
    if (loadingId !== undefined) dismissActionFeedback(loadingId);
    const detail = error instanceof Error ? error.message : messages.error || 'Action failed.';
    showActionError(messages.error || 'Action failed', detail);
    throw error;
  }
}