import type { CareDroidScreenMode } from '../central-node/careDroidCentralNode';
import useOperationalIntelligenceCore from './useOperationalIntelligenceCore';
import useRouteScreenMode from './useRouteScreenMode';

export type UseOperationalIntelligenceOptions = {
  screenMode?: CareDroidScreenMode;
  realtime?: boolean;
};

/**
 * Every current call site (Header, the Whiteboard, EmergencyAnalytics,
 * EmergencySettings, useNotificationCenter, useHeaderOperationalMetrics) only reads
 * `.centralSnapshot`/`.snapshot` — fields useAiChiefOrchestrator passes through from
 * this same core hook unmodified. Routing through the full orchestrator was building
 * the entire unified knowledge graph plus the AI recommendation/risk snapshot on every
 * render of those (mostly globally-mounted) consumers and throwing the result away.
 * Delegate directly to the lightweight core hook instead; callers that actually need
 * the AI Chief snapshot/knowledge graph (CopilotPanel, AiChiefRouteRecommendationsPanel,
 * HospitalCommandCenter, OperationalIntelligenceBar) already call useAiChiefOrchestrator
 * directly and are unaffected.
 */
export function useOperationalIntelligence(options: UseOperationalIntelligenceOptions = {}) {
  const routeScreenMode = useRouteScreenMode();
  return useOperationalIntelligenceCore({
    screenMode: options.screenMode ?? routeScreenMode,
    realtime: options.realtime,
  });
}

export default useOperationalIntelligence;