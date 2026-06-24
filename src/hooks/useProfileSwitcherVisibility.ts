import { useUser } from '../contexts/UserContext';
import { isDemoPersonaUser } from '../config/demoPersonaModel';

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
}

/** Whether the workflow profile switcher should be shown in the shell. */
export function useProfileSwitcherVisibility(): boolean {
  const { user, authMode } = useUser();
  return (
    isLocalDevHost() ||
    authMode === 'open-access' ||
    authMode === 'platform-access' ||
    authMode === 'local-dev-demo' ||
    authMode === 'dev-demo' ||
    isDemoPersonaUser(user)
  );
}

export default useProfileSwitcherVisibility;