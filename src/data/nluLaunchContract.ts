/**
 * Expected NLU → SPA launch behavior (Tier A calculator UI, Tier B guided chat, pages, fleet).
 */

import { clinicalIntentToolsById } from './clinicalIntentToolCatalog';
import {
  AI_SYSTEM_REGISTRY_IDS,
  CLINICAL_AI_PAGE_REGISTRY_IDS,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  FLEET_TIER_A_REGISTRY_IDS,
  FLEET_TIER_B_CHAT_REGISTRY_IDS,
  NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  NLU_PROFILE_TOOL_IDS,
  NLU_TO_REGISTRY_ID,
  ORCHESTRATOR_TO_REGISTRY_ID,
  REGISTRY,
  TOOL_LAUNCH_PATHS,
} from './clinicalToolIdContract';
import { toolRegistryById } from './toolRegistry';

const HUB = TOOL_LAUNCH_PATHS.calculatorsHub;

function isCalculatorsHubPath(path) {
  return path === HUB;
}

/**
 * @typedef {'tier-a-calculator'|'tier-b-chat'|'clinical-page'|'fleet-page'|'fleet-chat'|'unknown-fallback'} NluLaunchKind
 */

/**
 * @param {string} nluToolId
 * @returns {{
 *   nluToolId: string,
 *   kind: NluLaunchKind,
 *   registryId: string|null,
 *   expectsDedicatedCalculatorPath: boolean,
 *   expectsDashboardChat: boolean,
 *   expectsChatSeed: boolean,
 *   allowsHubPath: boolean,
 * }}
 */
export function getNluLaunchExpectation(nluToolId) {
  const nlu = clinicalIntentToolsById[nluToolId];
  if (!nlu) {
    return {
      nluToolId,
      kind: 'unknown-fallback',
      registryId: NLU_TO_REGISTRY_ID[nluToolId] || null,
      expectsDedicatedCalculatorPath: false,
      expectsDashboardChat: true,
      expectsChatSeed: true,
      allowsHubPath: false,
    };
  }

  const registryId =
    (toolRegistryById[nluToolId] && nluToolId) ||
    ORCHESTRATOR_TO_REGISTRY_ID[nluToolId] ||
    NLU_TO_REGISTRY_ID[nluToolId] ||
    nlu.sidebarToolId ||
    null;

  if (FLEET_TIER_A_REGISTRY_IDS.includes(registryId)) {
    return {
      nluToolId,
      kind: 'fleet-page',
      registryId,
      expectsDedicatedCalculatorPath: false,
      expectsDashboardChat: false,
      expectsChatSeed: Boolean(nlu.chatSeed),
      allowsHubPath: false,
    };
  }

  if (FLEET_TIER_B_CHAT_REGISTRY_IDS.includes(registryId) || nluToolId === REGISTRY.dispatchAi) {
    return {
      nluToolId,
      kind: 'fleet-chat',
      registryId,
      expectsDedicatedCalculatorPath: false,
      expectsDashboardChat: true,
      expectsChatSeed: true,
      allowsHubPath: true,
    };
  }

  if (AI_SYSTEM_REGISTRY_IDS.includes(registryId) && nlu.path === TOOL_LAUNCH_PATHS.assistant) {
    return {
      nluToolId,
      kind: 'tier-b-chat',
      registryId,
      expectsDedicatedCalculatorPath: false,
      expectsDashboardChat: true,
      expectsChatSeed: true,
      allowsHubPath: false,
    };
  }

  if (
    AI_SYSTEM_REGISTRY_IDS.includes(registryId) ||
    CLINICAL_AI_PAGE_REGISTRY_IDS.includes(registryId) ||
    CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS.includes(registryId)
  ) {
    return {
      nluToolId,
      kind: 'clinical-page',
      registryId,
      expectsDedicatedCalculatorPath: false,
      expectsDashboardChat: false,
      expectsChatSeed: Boolean(nlu.chatSeed),
      allowsHubPath: isCalculatorsHubPath(nlu.path),
    };
  }

  if (
    CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.includes(registryId) ||
    (nlu.path && !isCalculatorsHubPath(nlu.path) && nlu.path.includes('/calculator'))
  ) {
    return {
      nluToolId,
      kind: 'tier-a-calculator',
      registryId,
      expectsDedicatedCalculatorPath: true,
      expectsDashboardChat: false,
      expectsChatSeed: true,
      allowsHubPath: false,
    };
  }

  if (
    CLINICAL_TIER_B_CHAT_REGISTRY_IDS.includes(registryId) ||
    NLU_HUB_ONLY_PROFILE_TOOL_IDS.includes(nluToolId) ||
    isCalculatorsHubPath(nlu.path)
  ) {
    const registryPath = toolRegistryById[registryId]?.path;
    const launchPath = registryPath || nlu.path;
    const launchesFromHub =
      NLU_HUB_ONLY_PROFILE_TOOL_IDS.includes(nluToolId) || isCalculatorsHubPath(launchPath);
    return {
      nluToolId,
      kind: 'tier-b-chat',
      registryId,
      expectsDedicatedCalculatorPath: false,
      expectsDashboardChat: launchesFromHub,
      expectsChatSeed: true,
      allowsHubPath: launchesFromHub,
    };
  }

  if (nlu.path && !isCalculatorsHubPath(nlu.path) && nlu.path !== TOOL_LAUNCH_PATHS.assistant) {
    return {
      nluToolId,
      kind: 'clinical-page',
      registryId,
      expectsDedicatedCalculatorPath: false,
      expectsDashboardChat: false,
      expectsChatSeed: Boolean(nlu.chatSeed),
      allowsHubPath: false,
    };
  }

  return {
    nluToolId,
    kind: 'unknown-fallback',
    registryId,
    expectsDedicatedCalculatorPath: false,
    expectsDashboardChat: true,
    expectsChatSeed: true,
    allowsHubPath: false,
  };
}

export const NLU_LAUNCH_EXPECTATIONS = Object.freeze(
  NLU_PROFILE_TOOL_IDS.map((id) => getNluLaunchExpectation(id)),
);
