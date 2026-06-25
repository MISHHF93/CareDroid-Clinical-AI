import type { ToolRecommendation } from '../../lib/patient-orchestration';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  applyRegistryToolLaunch,
  resolveRegistryToolLaunchAccess,
  type RegistryToolNavigationPlan,
} from '../navigation/registryToolLaunch';
import { resolveClinicalToolLaunchTarget } from './unifiedClinicalToolsBridge';

export type OrchestrationLaunchDetail = {
  patientId: string;
  recommendation: ToolRecommendation;
};

export type CareDroidToolLaunchSource =
  | 'orchestration'
  | 'registry'
  | 'calculator-hub'
  | 'copilot'
  | 'patient-card';

export type LaunchOrchestrationInput = OrchestrationLaunchDetail & {
  source?: CareDroidToolLaunchSource;
};

export type LaunchRegistryToolHandlers = Parameters<typeof applyRegistryToolLaunch>[1];

function buildToolsPath(patientId: string, open?: string, filter = 'clinical-tools') {
  const params = new URLSearchParams({
    source: 'orchestration',
    filter,
    patientId,
  });
  if (open) {
    params.set('open', open);
    params.set('q', open);
  }
  return `${CANONICAL_ROUTES.emergencyTools}?${params.toString()}`;
}

function dispatchCalculatorOpen(calculatorId: string, patientId: string) {
  window.dispatchEvent(
    new CustomEvent('ed:open-calculator', {
      detail: { calculatorId, patientId },
    }),
  );
}

function dispatchToolsOpen(detail: Record<string, unknown>) {
  window.dispatchEvent(
    new CustomEvent('ed:open-tools', {
      detail,
    }),
  );
}

function dispatchCopilotPrefill(patientId: string, message: string) {
  window.dispatchEvent(
    new CustomEvent('ed:copilot-prefill', {
      detail: { message, patientId },
    }),
  );
}

function navigateUnifiedToolsPath(
  input: Parameters<typeof resolveClinicalToolLaunchTarget>[0],
) {
  const target = resolveClinicalToolLaunchTarget(input);

  if (target.mode === 'reception-embed') {
    const params = new URLSearchParams(
      target.search.startsWith('?') ? target.search.slice(1) : target.search,
    );
    const calculatorId = params.get('calc') || params.get('open') || params.get('q');
    if (calculatorId) {
      dispatchCalculatorOpen(calculatorId, input.patientId || '');
      return;
    }
    dispatchToolsOpen({
      source: input.source || 'orchestration',
      filter: 'calculator',
      patientId: input.patientId,
    });
    return;
  }

  if (target.mode === 'copilot') {
    if (input.patientId) {
      dispatchCopilotPrefill(
        input.patientId,
        `Open clinical tools for patient ${input.patientId}. Staff confirmation required.`,
      );
    }
    return;
  }

  const params = new URLSearchParams(
    target.search.startsWith('?') ? target.search.slice(1) : target.search,
  );
  dispatchToolsOpen({
    source: input.source || 'orchestration',
    filter: params.get('filter') || input.filter || 'all',
    query: params.get('open') || params.get('q') || input.toolId,
    patientId: input.patientId || params.get('patientId') || undefined,
  });
}

/**
 * Launch a patient-card-aware orchestration recommendation (calculator, tool, copilot, workflow).
 */
export function launchOrchestrationRecommendation({
  patientId,
  recommendation,
}: LaunchOrchestrationInput): void {
  const registryId = recommendation.registryId || recommendation.toolId;

  switch (recommendation.launchKind) {
    case 'calculator':
      dispatchCalculatorOpen(registryId, patientId);
      break;
    case 'tool':
    case 'protocol':
      dispatchToolsOpen({
        source: 'orchestration',
        filter: recommendation.category,
        patientId,
        open: registryId,
        q: registryId,
      });
      break;
    case 'copilot':
      dispatchCopilotPrefill(
        patientId,
        `Review ${recommendation.label} for patient ${patientId}. ${recommendation.reason}. Staff confirmation required.`,
      );
      break;
    case 'checklist':
    case 'workflow':
      navigateUnifiedToolsPath({
        kind: 'tools-hub',
        toolId: registryId,
        patientId,
        filter: 'clinical-tools',
        source: 'orchestration',
      });
      break;
    default:
      dispatchToolsOpen({
        source: 'orchestration',
        filter: 'all',
        patientId,
        open: registryId,
      });
  }
}

export function launchOrchestrationMoreTools(patientId: string, query = '') {
  dispatchToolsOpen({
    source: 'orchestration',
    filter: 'all',
    patientId,
    query: query || undefined,
  });
}

/**
 * Launch a catalog/registry tool with entitlement checks (sidebar, deep links, hub).
 */
export function launchRegistryTool(
  toolId: string,
  handlers: LaunchRegistryToolHandlers,
): RegistryToolNavigationPlan {
  return applyRegistryToolLaunch(toolId, handlers);
}

export function canLaunchRegistryTool(
  toolId: string,
  context?: Parameters<typeof resolveRegistryToolLaunchAccess>[1],
) {
  return resolveRegistryToolLaunchAccess(toolId, context).allowed;
}

export type CareDroidToolLaunchInput =
  | ({ kind: 'orchestration' } & LaunchOrchestrationInput)
  | { kind: 'registry'; toolId: string; handlers: LaunchRegistryToolHandlers }
  | { kind: 'calculator'; calculatorId: string; patientId: string; source?: CareDroidToolLaunchSource }
  | { kind: 'copilot-prefill'; patientId: string; message: string };

/**
 * Unified entry for ED tool launches from patient cards, orchestration, registry, and copilot.
 */
export function launchCareDroidTool(input: CareDroidToolLaunchInput): RegistryToolNavigationPlan | void {
  switch (input.kind) {
    case 'orchestration':
      launchOrchestrationRecommendation(input);
      return undefined;
    case 'registry':
      return launchRegistryTool(input.toolId, input.handlers);
    case 'calculator':
      dispatchCalculatorOpen(input.calculatorId, input.patientId);
      return undefined;
    case 'copilot-prefill':
      dispatchCopilotPrefill(input.patientId, input.message);
      return undefined;
    default:
      return undefined;
  }
}