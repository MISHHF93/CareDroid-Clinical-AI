import type { ComplaintRouteSnapshot, EdOperationalStage, OrchestrationToolDefinition } from './orchestrationTypes';
import { ORCHESTRATION_TOOL_CATALOG } from './toolCatalog';

const CLINICAL_ROLES: OrchestrationToolDefinition['roles'] = [
  'triage_nurse',
  'physician',
  'charge_nurse',
  'ed_manager',
  'admin',
];

const ROUTE_CALCULATOR_STAGES: EdOperationalStage[] = [
  'triage_handoff',
  'physician_assessment',
  'observation_reassessment',
  'deterioration_concern',
  'waiting_intake',
];

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function catalogToolIds(tool: OrchestrationToolDefinition): string[] {
  return [tool.id, tool.toolId, tool.registryId, ...(tool.complaintScoreIds || [])]
    .filter(Boolean)
    .map((id) => normalize(id));
}

function routeScoreCoveredByCatalog(scoreId: string, catalog: readonly OrchestrationToolDefinition[]): boolean {
  const normalizedScore = normalize(scoreId);
  return catalog.some((tool) => catalogToolIds(tool).some((id) => id === normalizedScore));
}

export function createComplaintRouteCalculatorTool(
  scoreId: string,
  label?: string,
): OrchestrationToolDefinition {
  return {
    id: scoreId,
    toolId: scoreId,
    label: label || scoreId,
    category: 'risk_score',
    launchKind: 'calculator',
    registryId: scoreId,
    maturity: 'live',
    stages: ROUTE_CALCULATOR_STAGES,
    roles: CLINICAL_ROLES,
    complaintScoreIds: [scoreId],
    requiresIdentity: true,
    baseScore: 88,
  };
}

/** Ensures every complaint-route calculator has a catalog entry for orchestration scoring. */
export function mergeComplaintRouteCalculatorTools(
  complaintRoute: ComplaintRouteSnapshot | null,
  catalog: readonly OrchestrationToolDefinition[] = ORCHESTRATION_TOOL_CATALOG,
): OrchestrationToolDefinition[] {
  if (!complaintRoute?.scoreIds.length) return [...catalog];

  const extras = complaintRoute.scoreIds
    .filter((scoreId) => !routeScoreCoveredByCatalog(scoreId, catalog))
    .map((scoreId, index) =>
      createComplaintRouteCalculatorTool(scoreId, complaintRoute.calculatorLabels[index]),
    );

  if (!extras.length) return [...catalog];
  return [...catalog, ...extras];
}

export function resolvePrimaryRecommendationCount(
  complaintRoute: ComplaintRouteSnapshot | null,
  missingScores: string[],
  requestedMax?: number,
): number {
  const routeCount = complaintRoute?.scoreIds.length || 0;
  const missingCount = missingScores.length;
  const floor = routeCount > 1 ? Math.min(routeCount, 3) : 2;
  const gapBoost = missingCount > 1 ? Math.min(missingCount, 3) : floor;
  const computed = Math.max(floor, gapBoost);
  if (typeof requestedMax === 'number') return Math.max(requestedMax, computed);
  return computed;
}