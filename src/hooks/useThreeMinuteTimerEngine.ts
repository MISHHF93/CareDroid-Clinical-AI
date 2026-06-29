import { useEffect } from 'react';
import { startTimerEngine } from '../engine/threeMinuteTimerEngine';

/** Starts the 3-minute response timer engine as a singleton for the app lifetime. */
export function useThreeMinuteTimerEngine(): void {
  useEffect(() => {
    const stop = startTimerEngine();
    return stop;
  }, []);
}
