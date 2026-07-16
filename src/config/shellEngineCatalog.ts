/**
 * Architect Mode Stage F — classification of engines bootstrapped by AppShell.
 *
 * durability:
 *   - session: in-browser timers/state only; lost on reload unless synced to API
 *   - durable: writes to backend / survives reload when online
 *
 * authoritative: true when this engine is the SoT for its domain while running
 * experimental: true when should not block critical clinical paths if it fails
 */

export type EngineDurability = 'session' | 'durable';

export type ShellEngineDefinition = {
  id: string;
  label: string;
  durability: EngineDurability;
  authoritative: boolean;
  experimental: boolean;
  /** AppShell only starts when this capability flag is true (null = always). */
  capabilityFlag:
    | 'showReassessmentEngine'
    | 'showCapacityEngine'
    | 'showPatientFlowEngine'
    | 'showAdministrativeAutomationEngine'
    | 'showOperationalIntelligenceEngine'
    | null;
  /** User-visible label when data is session-only */
  staleLabel?: string;
};

export const SHELL_ENGINE_CATALOG: readonly ShellEngineDefinition[] = Object.freeze([
  Object.freeze({
    id: 'reassessment',
    label: 'Reassessment engine',
    durability: 'session',
    authoritative: true,
    experimental: false,
    capabilityFlag: 'showReassessmentEngine',
    staleLabel: 'Reassessment timers are session-local until server sync',
  }),
  Object.freeze({
    id: 'capacity',
    label: 'Capacity engine',
    durability: 'session',
    authoritative: true,
    experimental: false,
    capabilityFlag: 'showCapacityEngine',
    staleLabel: 'Capacity score is session-local unless API snapshot overwrites',
  }),
  Object.freeze({
    id: 'continuousPatientFlow',
    label: 'Continuous patient flow',
    durability: 'session',
    authoritative: false,
    experimental: false,
    capabilityFlag: 'showPatientFlowEngine',
  }),
  Object.freeze({
    id: 'administrativeAutomation',
    label: 'Administrative automation',
    durability: 'session',
    authoritative: false,
    experimental: true,
    capabilityFlag: 'showAdministrativeAutomationEngine',
  }),
  Object.freeze({
    id: 'unifiedWorkflowAutomation',
    label: 'Unified workflow automation',
    durability: 'session',
    authoritative: false,
    experimental: true,
    capabilityFlag: 'showAdministrativeAutomationEngine',
  }),
  Object.freeze({
    id: 'unifiedOperationalIntelligence',
    label: 'Operational intelligence',
    durability: 'session',
    authoritative: false,
    experimental: true,
    capabilityFlag: 'showOperationalIntelligenceEngine',
  }),
  Object.freeze({
    id: 'unifiedApplicationKnowledgeGraph',
    label: 'Application knowledge graph',
    durability: 'session',
    authoritative: false,
    experimental: true,
    capabilityFlag: 'showOperationalIntelligenceEngine',
  }),
  Object.freeze({
    id: 'livingDocumentation',
    label: 'Living documentation',
    durability: 'session',
    authoritative: false,
    experimental: true,
    capabilityFlag: null,
  }),
  Object.freeze({
    id: 'alertsPoll',
    label: 'Alert lifecycle poll (30s)',
    durability: 'session',
    authoritative: true,
    experimental: false,
    capabilityFlag: null,
    staleLabel: 'Alerts refresh on interval; not a multi-user live bus by itself',
  }),
]);

export function listExperimentalShellEngines(): ShellEngineDefinition[] {
  return SHELL_ENGINE_CATALOG.filter((e) => e.experimental);
}

export function listAuthoritativeSessionEngines(): ShellEngineDefinition[] {
  return SHELL_ENGINE_CATALOG.filter((e) => e.authoritative && e.durability === 'session');
}

export function getShellEngine(id: string): ShellEngineDefinition | undefined {
  return SHELL_ENGINE_CATALOG.find((e) => e.id === id);
}

export type ExperimentalEngineEnv = {
  DEV?: boolean;
  PROD?: boolean;
  MODE?: string;
  VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES?: string;
};

/**
 * Production-safe default: experimental engines OFF unless explicitly enabled.
 * Dev default: ON (so local ED demos retain automation labs).
 * Override with VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES=true|false.
 */
export function resolveExperimentalShellEnginesEnabled(
  env: ExperimentalEngineEnv = {},
): boolean {
  const explicit = String(env.VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES ?? '')
    .trim()
    .toLowerCase();
  if (explicit === 'true' || explicit === '1' || explicit === 'yes') return true;
  if (explicit === 'false' || explicit === '0' || explicit === 'no') return false;
  if (env.PROD === true || env.MODE === 'production') return false;
  return Boolean(env.DEV);
}

/** Runtime helper bound to Vite env. */
export function isExperimentalShellEngineRuntimeEnabled(): boolean {
  return resolveExperimentalShellEnginesEnabled({
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    MODE: import.meta.env.MODE,
    VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES: import.meta.env
      .VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES as string | undefined,
  });
}

/** True when this catalog engine may start given capability flags + prod gate. */
export function shouldStartShellEngine(
  engineId: string,
  capabilities: Partial<
    Record<
      NonNullable<ShellEngineDefinition['capabilityFlag']>,
      boolean
    >
  >,
  options: { experimentalEnabled?: boolean } = {},
): boolean {
  const engine = getShellEngine(engineId);
  if (!engine) return false;
  const experimentalEnabled =
    options.experimentalEnabled ?? isExperimentalShellEngineRuntimeEnabled();
  if (engine.experimental && !experimentalEnabled) return false;
  if (engine.capabilityFlag == null) return true;
  return Boolean(capabilities[engine.capabilityFlag]);
}

/**
 * Copy for StateSourceNotice when surfaces consume session engines.
 * Does not claim multi-user live durability.
 */
export function buildSessionEngineSourceDetails(
  engineIds?: readonly string[],
): string {
  const engines = engineIds?.length
    ? engineIds.map((id) => getShellEngine(id)).filter(Boolean)
    : listAuthoritativeSessionEngines();
  return engines
    .map((engine) => engine!.staleLabel || `${engine!.label} is session-local`)
    .join(' ');
}
