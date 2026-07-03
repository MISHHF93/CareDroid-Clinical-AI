import type { CareDroidScreenMode } from '../central-node/careDroidCentralNode';
import useAiChiefOrchestrator from './useAiChiefOrchestrator';

export type UseOperationalIntelligenceOptions = {
  screenMode?: CareDroidScreenMode;
  realtime?: boolean;
};

/**
 * Backward-compatible operational intelligence hook.
 * Delegates to the AI Chief orchestrator — the canonical continuous monitoring entry point.
 */
export function useOperationalIntelligence(options: UseOperationalIntelligenceOptions = {}) {
  const aiChief = useAiChiefOrchestrator({
    screenMode: options.screenMode,
    realtime: options.realtime,
  });
  return aiChief.operationalIntelligence;
}

export default useOperationalIntelligence;