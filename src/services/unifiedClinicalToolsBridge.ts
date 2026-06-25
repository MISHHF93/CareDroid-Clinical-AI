/**
 * Unified clinical tools bridge — registry, calculators, orchestration, native-ai rules,
 * and profile policy wired to the reception-first ED frontend.
 */
import { ORCHESTRATION_TOOL_CATALOG } from '../../lib/patient-orchestration/toolCatalog';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  compileUserProfile,
  type CompiledUserProfile,
  type CompileUserProfileInput,
} from '../config/userProfileCompiler';
import {
  canAccessEmergencyRoute,
  EMERGENCY_ROLE_IDS,
} from '../config/emergencyRolePermissions';
import { resolveCatalogLaunch } from '../data/clinicalCatalogWiring';
import {
  getUserFacingToolRegistryProjection,
  resolveToolInventoryRecord,
  type ToolInventoryRecord,
} from '../data/toolInventory';
import { isRegisteredCalculatorSlug } from '../routes/clinicalToolRoutes';

export const CLINICAL_TOOL_ARTIFACT_SOURCES = Object.freeze([
  'tool-registry',
  'tool-inventory',
  'orchestration-catalog',
  'native-ai-triage-rules',
  'clinical-calculators',
  'backend-executors',
] as const);

export type ClinicalToolArtifactSource = (typeof CLINICAL_TOOL_ARTIFACT_SOURCES)[number];

export type UnifiedToolLaunchKind =
  | 'calculator'
  | 'tools-hub'
  | 'copilot'
  | 'reception-embed'
  | 'orchestration';

export type UnifiedToolLaunchInput = Readonly<{
  emergencyRoleId?: string | null;
  saasRole?: string | null;
  canAccessToolsRoute?: boolean;
  kind: UnifiedToolLaunchKind;
  toolId?: string | null;
  calculatorId?: string | null;
  patientId?: string | null;
  filter?: string | null;
  source?: string | null;
}>;

export type UnifiedToolLaunchTarget = Readonly<{
  pathname: string;
  search: string;
  mode: UnifiedToolLaunchKind;
}>;

function buildSearch(params: Record<string, string | null | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const search = searchParams.toString();
  return search ? `?${search}` : '';
}

export function buildEmergencyToolsLaunchPath(
  params: Record<string, string | null | undefined> = {},
): string {
  return `${CANONICAL_ROUTES.emergencyTools}${buildSearch(params)}`;
}

export function buildReceptionCalculatorEmbedPath(
  params: Record<string, string | null | undefined> = {},
): string {
  return `${CANONICAL_ROUTES.emergencyReception}${buildSearch({
    calc: params.calculatorId || params.calc || params.open || params.q,
    open: params.calculatorId || params.open || params.calc || params.q,
    patientId: params.patientId,
    source: params.source || 'reception-tools',
    ...params,
  })}`;
}

export function resolveCalculatorSlug(toolOrCalcId: string | null | undefined): string | null {
  const normalized = String(toolOrCalcId || '').trim();
  if (!normalized) return null;
  const launch = resolveCatalogLaunch(normalized);
  const inventory = resolveToolInventoryRecord(launch.registryId || normalized);
  const slug =
    inventory?.calculatorSlug ||
    (isRegisteredCalculatorSlug(normalized) ? normalized : null) ||
    (isRegisteredCalculatorSlug(launch.registryId || '') ? launch.registryId : null);
  return slug || (isRegisteredCalculatorSlug(normalized) ? normalized : null);
}

export function isCalculatorArtifact(toolId: string | null | undefined): boolean {
  const slug = resolveCalculatorSlug(toolId);
  if (slug) return true;
  const inventory = resolveToolInventoryRecord(String(toolId || ''));
  return inventory?.category === 'Calculator' || inventory?.surface === 'calculator-form';
}

export function shouldEmbedToolsOnReception(input: {
  emergencyRoleId?: string | null;
  canAccessToolsRoute?: boolean;
  kind?: UnifiedToolLaunchKind;
  toolId?: string | null;
  calculatorId?: string | null;
}): boolean {
  if (input.canAccessToolsRoute) return false;
  const role = String(input.emergencyRoleId || '');
  if (role === EMERGENCY_ROLE_IDS.registrationClerk) return true;
  if (input.kind === 'calculator' || input.kind === 'reception-embed') return true;
  const targetId = input.calculatorId || input.toolId;
  return Boolean(targetId && isCalculatorArtifact(targetId));
}

export function resolveClinicalToolLaunchTarget(
  input: UnifiedToolLaunchInput,
): UnifiedToolLaunchTarget {
  const calculatorId = resolveCalculatorSlug(input.calculatorId || input.toolId);
  const isCalculator =
    input.kind === 'calculator' ||
    (calculatorId && (input.kind === 'orchestration' || isCalculatorArtifact(input.toolId)));
  const embedOnReception = shouldEmbedToolsOnReception({
    emergencyRoleId: input.emergencyRoleId,
    canAccessToolsRoute: input.canAccessToolsRoute,
    kind: isCalculator ? 'calculator' : input.kind,
    toolId: input.toolId,
    calculatorId,
  });

  if (embedOnReception) {
    if (isCalculator && calculatorId) {
      return Object.freeze({
        pathname: CANONICAL_ROUTES.emergencyReception,
        search: buildSearch({
          calc: calculatorId,
          open: calculatorId,
          patientId: input.patientId,
          source: input.source || 'clinical-tools',
        }),
        mode: 'reception-embed',
      });
    }
    return Object.freeze({
      pathname: CANONICAL_ROUTES.emergencyReception,
      search: buildSearch({
        tools: 'calculators',
        source: input.source || 'clinical-tools',
        patientId: input.patientId,
      }),
      mode: 'reception-embed',
    });
  }

  if (input.kind === 'copilot') {
    const canAccessCopilot = input.emergencyRoleId
      ? canAccessEmergencyRoute(input.emergencyRoleId, CANONICAL_ROUTES.emergencyCopilot)
      : true;
    if (!canAccessCopilot) {
      if (calculatorId) {
        return resolveClinicalToolLaunchTarget({
          ...input,
          kind: 'calculator',
          calculatorId,
        });
      }
      return resolveClinicalToolLaunchTarget({
        ...input,
        kind: 'reception-embed',
        source: input.source || 'clinical-tools',
      });
    }
    return Object.freeze({
      pathname: CANONICAL_ROUTES.emergencyCopilot,
      search: input.patientId ? buildSearch({ patientId: input.patientId }) : '',
      mode: 'copilot',
    });
  }

  return Object.freeze({
    pathname: CANONICAL_ROUTES.emergencyTools,
    search: buildSearch({
      source: input.source || 'clinical-tools',
      filter: isCalculator ? 'calculator' : input.filter || 'all',
      q: calculatorId || input.toolId || undefined,
      open: calculatorId || input.toolId || undefined,
      calc: calculatorId || undefined,
      patientId: input.patientId || undefined,
    }),
    mode: isCalculator ? 'calculator' : 'tools-hub',
  });
}

export function remapRegistryNavigationForRole(
  plan: { pathname: string; search?: string },
  context: {
    emergencyRoleId?: string | null;
    canAccessToolsRoute?: boolean;
    toolId?: string | null;
    launchMode?: string | null;
  },
): { pathname: string; search: string } {
  const search = plan.search || '';
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const toolId =
    context.toolId || params.get('open') || params.get('calc') || params.get('q');
  const canAccessCopilot = context.emergencyRoleId
    ? canAccessEmergencyRoute(context.emergencyRoleId, CANONICAL_ROUTES.emergencyCopilot)
    : true;

  if (plan.pathname === CANONICAL_ROUTES.emergencyCopilot && !canAccessCopilot) {
    const remapped = resolveClinicalToolLaunchTarget({
      emergencyRoleId: context.emergencyRoleId,
      canAccessToolsRoute: context.canAccessToolsRoute,
      kind:
        toolId && isCalculatorArtifact(toolId)
          ? 'calculator'
          : context.launchMode === 'chat-assisted'
            ? 'reception-embed'
            : 'tools-hub',
      toolId,
      calculatorId: toolId,
      patientId: params.get('patientId'),
      filter: 'calculator',
      source: params.get('source') || 'clinical-tools',
    });
    return { pathname: remapped.pathname, search: remapped.search };
  }

  if (plan.pathname !== CANONICAL_ROUTES.emergencyTools) {
    return { pathname: plan.pathname, search };
  }

  const remapped = resolveClinicalToolLaunchTarget({
    emergencyRoleId: context.emergencyRoleId,
    canAccessToolsRoute: context.canAccessToolsRoute,
    kind: params.get('filter') === 'calculator' || isCalculatorArtifact(toolId) ? 'calculator' : 'tools-hub',
    toolId,
    calculatorId: toolId,
    patientId: params.get('patientId'),
    filter: params.get('filter'),
    source: params.get('source'),
  });

  return { pathname: remapped.pathname, search: remapped.search };
}

export function getUnifiedClinicalToolsProfile(
  input: CompileUserProfileInput,
): CompiledUserProfile {
  return compileUserProfile({
    ...input,
    tools: input.tools?.length ? input.tools : getUserFacingToolRegistryProjection(),
  });
}

export function listReceptionDeskCalculatorTools(
  compiled: CompiledUserProfile,
): ToolInventoryRecord[] {
  return compiled.tools.visible.filter(
    (tool) =>
      tool.category === 'Calculator' ||
      tool.surface === 'calculator-form' ||
      tool.id === 'calculators',
  ) as ToolInventoryRecord[];
}

export function listReceptionDeskCalculatorIds(
  compiled: CompiledUserProfile,
): string[] {
  const ids = new Set<string>();
  for (const tool of listReceptionDeskCalculatorTools(compiled)) {
    const slug = resolveCalculatorSlug(tool.id);
    if (slug) ids.add(slug);
    else if (tool.calculatorSlug) ids.add(String(tool.calculatorSlug));
    else if (tool.id && tool.id !== 'calculators') ids.add(tool.id);
  }
  return [...ids];
}

export function resolveReceptionDeskCalculatorIds(input: {
  saasRole?: string | null;
  emergencyRoleId?: string | null;
} = {}): string[] {
  const profile = getUnifiedClinicalToolsProfile({
    saasRole: input.saasRole || 'student',
    entitlementContext: input.emergencyRoleId
      ? { emergencyRoleId: input.emergencyRoleId, user: { role: input.emergencyRoleId } }
      : undefined,
  });
  return listReceptionDeskCalculatorIds(profile);
}

export function listOrchestrationToolsForRole(emergencyRoleId: string) {
  return ORCHESTRATION_TOOL_CATALOG.filter((tool) => tool.roles.includes(emergencyRoleId as never));
}

export function getUnifiedArtifactSources(): readonly ClinicalToolArtifactSource[] {
  return CLINICAL_TOOL_ARTIFACT_SOURCES;
}