import { useMemo } from 'react';
import {
  resolveScreenDensityProfile,
  type ScreenDensityProfile,
} from '../config/screenDensityModeModel';
import useRouteScreenMode from './useRouteScreenMode';

export function useScreenDensityMode(): ScreenDensityProfile {
  const screenMode = useRouteScreenMode();
  return useMemo(() => resolveScreenDensityProfile(screenMode), [screenMode]);
}

export default useScreenDensityMode;
