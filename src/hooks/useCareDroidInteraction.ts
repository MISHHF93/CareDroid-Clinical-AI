import { useCallback, useState } from 'react';
import {
  confirmCareDroidAction,
  runWithActionFeedback,
  showActionError,
  showActionFeedback,
  showActionInfo,
  showActionSuccess,
} from '../services/careDroidInteractionFeedback';
import type { ActionFeedbackOptions, ConfirmActionOptions } from '../config/careDroidInteractionModel';

export function useCareDroidInteraction() {
  const [pending, setPending] = useState(false);

  const confirm = useCallback((options: ConfirmActionOptions) => confirmCareDroidAction(options), []);

  const runAction = useCallback(
    async <T>(task: () => Promise<T>, messages: { loading?: string; success: string; error?: string }) => {
      setPending(true);
      try {
        return await runWithActionFeedback(task, messages);
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return {
    pending,
    confirm,
    runAction,
    notify: showActionFeedback,
    success: showActionSuccess,
    error: showActionError,
    info: showActionInfo,
  } satisfies {
    pending: boolean;
    confirm: typeof confirmCareDroidAction;
    runAction: typeof runAction;
    notify: (options: ActionFeedbackOptions) => string | number;
    success: typeof showActionSuccess;
    error: typeof showActionError;
    info: typeof showActionInfo;
  };
}