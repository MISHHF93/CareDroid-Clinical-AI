import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { resolveReceptionDeskUi } from '../config/receptionDeskUiModel';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';
import useRouteScreenMode from './useRouteScreenMode';

export function useReceptionDeskUi() {
  const { role } = useEmergencyRolePermissions();
  const screenMode = useRouteScreenMode();
  const location = useLocation();
  const isReceptionRoute = location.pathname.startsWith(CANONICAL_ROUTES.emergencyReception);

  return useMemo(
    () => resolveReceptionDeskUi({ role, isReceptionRoute, screenMode }),
    [isReceptionRoute, role, screenMode],
  );
}

export default useReceptionDeskUi;
