import { useMemo } from 'react';
import {
  resolveOperationalPresentation,
  type OperationalPresentationProfile,
} from '../config/emergencyOperationalPresentationModel';
import type { CareDroidScreenMode } from '../config/careDroidScreenModes';
import useRouteScreenMode from './useRouteScreenMode';

export function useOperationalPresentation(
  screenMode: CareDroidScreenMode | null = null,
): OperationalPresentationProfile {
  const routeScreenMode = useRouteScreenMode();
  const resolvedScreenMode = screenMode || routeScreenMode;

  return useMemo(() => resolveOperationalPresentation(resolvedScreenMode), [resolvedScreenMode]);
}

export default useOperationalPresentation;
