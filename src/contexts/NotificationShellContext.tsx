import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNotificationCenter } from '../hooks/useNotificationCenter';

type NotificationShellContextValue = ReturnType<typeof useNotificationCenter> & {
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
};

const NotificationShellContext = createContext<NotificationShellContextValue | null>(null);

export function NotificationShellProvider({ children }: { children: ReactNode }) {
  const center = useNotificationCenter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen((open) => !open), []);

  useEffect(() => {
    const open = () => setPanelOpen(true);
    const close = () => setPanelOpen(false);
    let pulseTimer: number | undefined;
    const pulse = () => {
      setPulseActive(true);
      if (pulseTimer) window.clearTimeout(pulseTimer);
      pulseTimer = window.setTimeout(() => {
        setPulseActive(false);
        pulseTimer = undefined;
      }, 1600);
    };
    document.addEventListener('open-notification-center', open);
    document.addEventListener('close-all-panels', close);
    document.addEventListener('notification-center-pulse', pulse);
    return () => {
      if (pulseTimer) window.clearTimeout(pulseTimer);
      document.removeEventListener('open-notification-center', open);
      document.removeEventListener('close-all-panels', close);
      document.removeEventListener('notification-center-pulse', pulse);
    };
  }, []);

  const value = useMemo(
    () => ({
      ...center,
      panelOpen,
      pulseActive,
      openPanel,
      closePanel,
      togglePanel,
    }),
    [center, closePanel, openPanel, panelOpen, pulseActive, togglePanel],
  );

  return (
    <NotificationShellContext.Provider value={value}>{children}</NotificationShellContext.Provider>
  );
}

export function useNotificationShell() {
  const context = useContext(NotificationShellContext);
  if (!context) {
    throw new Error('useNotificationShell must be used within NotificationShellProvider');
  }
  return context;
}

export function useNotificationShellOptional() {
  return useContext(NotificationShellContext);
}