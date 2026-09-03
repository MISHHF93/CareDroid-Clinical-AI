import { useCallback, useEffect, useState } from 'react';
import logger from '../utils/logger';

const STORAGE_KEY = 'careDroid.reception.pinnedActions.v1';

type ReceptionPinnedActionsState = {
  pinnedQueueTab: string | null;
};

const DEFAULT_STATE: ReceptionPinnedActionsState = { pinnedQueueTab: null };

function readStored(): ReceptionPinnedActionsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      pinnedQueueTab: typeof parsed?.pinnedQueueTab === 'string' ? parsed.pinnedQueueTab : null,
    };
  } catch (error) {
    logger.warn('Failed to read reception pinned actions', { error });
    return DEFAULT_STATE;
  }
}

/**
 * Reception-scoped "pinned workflow" preference — kept separate from
 * ToolPreferencesContext (which favorites/pins Tools-catalog entries, a
 * different domain) so the two don't get conflated. v1 covers a single
 * pinned default queue tab; the shape leaves room for more pinned reception
 * preferences without a breaking change.
 */
export default function useReceptionPinnedActions() {
  const [state, setState] = useState<ReceptionPinnedActionsState>(() => readStored());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      logger.warn('Failed to persist reception pinned actions', { error });
    }
  }, [state]);

  const setPinnedQueueTab = useCallback((tab: string | null) => {
    setState((current) => ({ ...current, pinnedQueueTab: tab }));
  }, []);

  const togglePinnedQueueTab = useCallback((tab: string) => {
    setState((current) => ({
      ...current,
      pinnedQueueTab: current.pinnedQueueTab === tab ? null : tab,
    }));
  }, []);

  return {
    pinnedQueueTab: state.pinnedQueueTab,
    setPinnedQueueTab,
    togglePinnedQueueTab,
  };
}
