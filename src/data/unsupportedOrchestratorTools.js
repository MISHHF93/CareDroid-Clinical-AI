/**
 * NLU / catalog tools without a backend tool-orchestrator executor (registerTool).
 *
 * Canonical POST executors: `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` in clinicalToolIdContract.js
 * Backend source: `backend/.../tool-orchestrator.registry.ts` (`NLU_TOOL_IDS_WITHOUT_EXECUTOR`).
 *
 * `backendExecutable: true` in clinicalIntentTools means NLU/chat may route to the backend —
 * only the three orchestrator ids support POST /tools/:id/execute.
 */

import {
  NLU,
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from './clinicalToolIdContract';

/** NLU ids with no registerTool() handler (includes dispatch-ai). */
export const UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS = Object.freeze(
  NLU_PROFILE_TOOL_IDS.filter((id) => !ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(id))
);

/**
 * @typedef {Object} UnsupportedOrchestratorToolRow
 * @property {string} nluToolId
 * @property {string|null} registryId
 * @property {'chat-assisted'|'calculator-form'|'clinical-page'|'fleet'} surface
 * @property {string} reason
 */

const FLEET_NLU = new Set([NLU.fleetCommand, NLU.predictiveMaintenance, NLU.routeOptimizer]);
const OPERATIONS_CHAT_NLU = new Set([
  NLU.dispatchAi,
  NLU.hospitalCommandAssistant,
  NLU.resourceAllocationAssistant,
  NLU.deviceRecommendationAssistant,
]);
const CLINICAL_PAGE_NLU = new Set([
  NLU.protocolLookup,
  NLU.aclsProtocol,
  NLU.atlsProtocol,
  NLU.differentialDiagnosis,
  NLU.antibioticGuide,
  NLU.abgInterpreter,
  NLU.cardiacTelemetryAnalyzer,
  NLU.ecgTrendEngine,
  NLU.arrhythmiaRiskClassifier,
  NLU.remoteCardiologyMonitoringDashboard,
  NLU.cardiologyCommandCenter,
  NLU.asthmaExacerbationAssistant,
  NLU.ventilatorSupportAssistant,
  NLU.oxygenEscalationHelper,
  NLU.copdWorkflowAssistant,
  NLU.ventilatorMonitoringDashboard,
  NLU.respiratoryTelemetryDashboard,
  NLU.sleepApneaAnalytics,
  NLU.pulmonaryTrendEngine,
  NLU.respiratoryCommandCenter,
]);

/** @returns {UnsupportedOrchestratorToolRow[]} */
export function buildUnsupportedOrchestratorToolDocs() {
  return UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS.map((nluToolId) => {
    let surface = 'calculator-form';
    if (OPERATIONS_CHAT_NLU.has(nluToolId)) surface = 'chat-assisted';
    else if (FLEET_NLU.has(nluToolId)) surface = 'fleet';
    else if (CLINICAL_PAGE_NLU.has(nluToolId)) surface = 'clinical-page';

    const reason =
      OPERATIONS_CHAT_NLU.has(nluToolId)
        ? 'Chat/NLU routing only; no POST /tools/:id/execute handler and no autonomous operations action.'
        : surface === 'calculator-form'
          ? 'Deterministic client-side calculator or chat-assisted scoring; no server executor.'
          : 'Clinical page or chat workflow; no tool-orchestrator registerTool().';

    return {
      nluToolId,
      registryId: ORCHESTRATOR_TO_REGISTRY_ID[nluToolId] ?? null,
      surface,
      reason,
    };
  });
}

export const UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS = Object.freeze(buildUnsupportedOrchestratorToolDocs());

/** Quick lookup: is this NLU id POST-executable on the orchestrator? */
export function isOrchestratorPostExecutable(nluToolId) {
  return ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(nluToolId);
}
