import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type HelpHubTab = 'page' | 'role' | 'process' | 'topics' | 'shortcuts' | 'reference';

type HelpHubState = {
  open: boolean;
  tab: HelpHubTab;
  topicId: string | null;
};

type HelpHubContextValue = {
  state: HelpHubState;
  openHelp: (options?: { tab?: HelpHubTab; topicId?: string }) => void;
  closeHelp: () => void;
  setTab: (tab: HelpHubTab) => void;
  setTopicId: (topicId: string | null) => void;
};

const HelpHubContext = createContext<HelpHubContextValue | null>(null);

const INITIAL_STATE: HelpHubState = Object.freeze({
  open: false,
  tab: 'page' as HelpHubTab,
  topicId: null,
});

export function HelpHubProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HelpHubState>(INITIAL_STATE);

  const openHelp = useCallback((options?: { tab?: HelpHubTab; topicId?: string }) => {
    setState({
      open: true,
      tab: options?.tab ?? 'page',
      topicId: options?.topicId ?? null,
    });
  }, []);

  const closeHelp = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const setTab = useCallback((tab: HelpHubTab) => {
    setState((current) => ({ ...current, tab }));
  }, []);

  const setTopicId = useCallback((topicId: string | null) => {
    setState((current) => ({ ...current, topicId, tab: 'topics' }));
  }, []);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: HelpHubTab; topicId?: string }>).detail || {};
      openHelp(detail);
    };
    const handleClose = () => closeHelp();
    window.addEventListener('open-help-hub', handleOpen);
    window.addEventListener('close-help-hub', handleClose);
    return () => {
      window.removeEventListener('open-help-hub', handleOpen);
      window.removeEventListener('close-help-hub', handleClose);
    };
  }, [closeHelp, openHelp]);

  const value = useMemo(
    () => ({ state, openHelp, closeHelp, setTab, setTopicId }),
    [state, openHelp, closeHelp, setTab, setTopicId],
  );

  return <HelpHubContext.Provider value={value}>{children}</HelpHubContext.Provider>;
}

export function useHelpHub() {
  const context = useContext(HelpHubContext);
  if (!context) {
    throw new Error('useHelpHub must be used within HelpHubProvider');
  }
  return context;
}

export function dispatchOpenHelpHub(options?: { tab?: HelpHubTab; topicId?: string }) {
  window.dispatchEvent(new CustomEvent('open-help-hub', { detail: options ?? {} }));
}
