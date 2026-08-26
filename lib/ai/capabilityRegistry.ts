/**
 * CareDroid Clinical Agent Capability Registry
 *
 * Every model, agent, calculator, service, API, data source and device in the
 * CareDroid ecosystem declares itself here with a structured capability record.
 *
 * The Chief does NOT get arbitrary access to the backend. It discovers available
 * capabilities through this registry, filtered by task, context, risk and policy,
 * and invokes them through their declared contracts.
 *
 * This is the fabric the Clinical Agent Command Platform is built on.
 *
 * === Authentication note (from current repo state) ===
 *
 * Per live-token-checks findings (charge-nurse copilot, EMS CopilotShell),
 * some chat-embedding surfaces currently replay the initial human-interaction
 * token on every turn. Capability invocation MUST NOT silently carry over a
 * token from a different user, role, patient/encounter context, or session.
 * Every invocation path through this registry must bind to the explicit
 * context the Chief assembled for the current task (see context binding below),
 * and must re-validate authorization on each call — never trust a token that
 * was minted for a different turn, different patient, or different user.
 */

import type { AIResponseSourceCategory } from './provenanceContract';
export type { AIResponseSourceCategory };

// ---------------------------------------------------------------------------
// Autonomy levels — the explicit ladder from observation to execution.
// More autonomy must never mean less control.
// ---------------------------------------------------------------------------

export const AUTONOMY_LEVELS = [
  'OBSERVE',
  'ANALYZE',
  'RECOMMEND',
  'PREPARE',
  'EXECUTE',
] as const;

export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const AUTONOMY_LEVEL_DESCRIPTIONS: Record<AutonomyLevel, string> = {
  OBSERVE: 'Read-only retrieval, monitoring, and display. May read patient/encounter/operational data. May not create, modify, or delete any state. May not dispatch, order, or commit anything.',
  ANALYZE: 'May compute, score, classify, and reason over retrieved data using deterministic rules, calculators, or approved models. May not change authoritative state. Findings are decision support, never action.',
  RECOMMEND: 'May propose candidate actions, next steps, or dispositions as structured recommendations with explicit evidence, uncertainty, and limitations. No action is taken. The clinician retains full choice.',
  PREPARE: 'May assemble drafts, briefs, task assignments, and approval-gated proposals. Prepared items are inert until an authorized human explicitly approves or rejects them.',
  EXECUTE: 'May perform explicitly authorized, scoped, reversible operations (e.g., open a calculator UI, create a draft task, post an acknowledgment). Consequential clinical mutations, orders, communications, patient-state changes, device commands, and other high-risk actions require explicit authorization and appropriate human approval — never an LLM-generated tool call firing automatically.',
};

// ---------------------------------------------------------------------------
// Risk classes
// ---------------------------------------------------------------------------

export const RISK_CLASSES = [
  'none',
  'informational',
  'low',
  'moderate',
  'elevated',
  'high',
  'critical',
] as const;

export type RiskClass = (typeof RISK_CLASSES)[number];

// ---------------------------------------------------------------------------
// Modalities — what kind of capability this is
// ---------------------------------------------------------------------------

export const MODALITIES = [
  'retrieval',
  'analysis',
  'calculator',
  'deterministic_rule',
  'model_prediction',
  'llm_generation',
  'rag_assisted',
  'document_understanding',
  'heuristic',
  'keyword_match',
  'fixture_demo',
  'operational',
  'workflow',
  'communication',
  'device_iot',
  'FHIR_interop',
  'human_review',
  'audit',
] as const;

export type Modality = (typeof MODALITIES)[number];

// ---------------------------------------------------------------------------
// Write capability categories — separates read-only observation from writes
// ---------------------------------------------------------------------------

export const WRITE_CATEGORIES = [
  'none',            // strictly read-only
  'draft',           // creates draft/inert objects (not authoritative)
  'task',            // creates/updates tasks (non-clinical state)
  'communication',   // sends messages, alerts, notifications
  'patient_state',   // changes patient journey/operational state
  'clinical_mutation', // modifies clinical data (orders, results, notes)
  'device_command',  // commands physical-world device/IoT
  'authoritative',   // full authoritative mutation — highest scrutiny
] as const;

export type WriteCategory = (typeof WRITE_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Truthful agent/result states
// ---------------------------------------------------------------------------

export const AGENT_STATES = [
  'LIVE',
  'STALE',
  'PENDING',
  'DEGRADED',
  'FAILED',
  'INSUFFICIENT_DATA',
  'CONFLICTING_EVIDENCE',
  'OUTSIDE_SCOPE',
  'TOOL_FAILURE',
  'REQUIRES_HUMAN_REVIEW',
] as const;

export type AgentState = (typeof AGENT_STATES)[number];

export const AGENT_STATE_DESCRIPTIONS: Record<string, string> = {
  LIVE: 'Capability is available and functioning normally.',
  STALE: 'Capability is operational but its data, model, or configuration is stale and may not reflect current state.',
  PENDING: 'Capability is queued, initializing, or awaiting prerequisite context.',
  DEGRADED: 'Capability is partially available with reduced reliability, scope, or fidelity.',
  FAILED: 'Capability failed to execute. No result should be treated as authoritative.',
  INSUFFICIENT_DATA: 'Capability cannot produce a reliable result because required input data is missing or incomplete.',
  CONFLICTING_EVIDENCE: 'Multiple evidence sources disagree; no single conclusion can be presented as authoritative without reconciliation.',
  OUTSIDE_SCOPE: 'Requested operation is outside this capability\'s declared scope, modality, or risk envelope.',
  TOOL_FAILURE: 'The underlying tool, model, or service failed. Distinguish from INSUFFICIENT_DATA — the tool ran but errored.',
  REQUIRES_HUMAN_REVIEW: 'Result has been prepared but requires human review before it can inform any action.',
};

// ---------------------------------------------------------------------------
// Capability type — what sort of thing this record describes
// ---------------------------------------------------------------------------

export const CAPABILITY_TYPES = [
  'model',
  'agent',
  'calculator',
  'service',
  'api',
  'data_source',
  'device_iot',
  'workflow',
  'human_review',
  'audit',
] as const;

export type CapabilityType = (typeof CAPABILITY_TYPES)[number];

// ---------------------------------------------------------------------------
// Failure behavior — how the capability behaves when it cannot deliver
// ---------------------------------------------------------------------------

export const FAILURE_MODES = [
  'none',
  'graceful_degradation',
  'silent_failure',     // DO NOT USE — forbidden; every failure must be detectable
  'explicit_error',
  'fallback_to_deterministic',
  'requires_human',
  'circuit_breaks',
] as const;

export type FailureMode = (typeof FAILURE_MODES)[number];

// ---------------------------------------------------------------------------
// Provenance & evidence expectation a capability declares up front
// ---------------------------------------------------------------------------

export interface DeclaredEvidence {
  /** What data the capability expects to use, by source identity. */
  expectedSources: string[];
  /** Whether the capability MUST cite evidence in its output (true for clinical). */
  requiresEvidence: boolean;
  /** Whether the capability can name the specific source of each finding. */
  supportsProvenance: boolean;
  /** Whether the capability can declare what data was missing. */
  reportsMissingData: boolean;
  /** Whether the capability reports its own uncertainty. */
  reportsUncertainty: boolean;
  /** Whether the capability fabricates when data is insufficient (MUST be false for clinical). */
  fabricatesWhenInsufficient: boolean;
}

// ---------------------------------------------------------------------------
// The capability record
// ---------------------------------------------------------------------------

export interface CapabilityRecord {
  /** Unique stable identity for this capability. Used for discovery, audit, and policy. */
  id: string;

  /** What sort of thing this is. */
  capabilityType: CapabilityType;

  /** Human-readable name. */
  name: string;

  /** Short purpose statement — one sentence a clinician/operator can read. */
  purpose: string;

  /** What modalities this capability uses. Prevents a deterministic calculator from being represented as an LLM. */
  modalities: Modality[];

  /** Version of the capability implementation. Changes when behavior, inputs, or outputs change. */
  version: string;

  /** Intended use — the specific clinical/operational job this capability is validated for. */
  intendedUse: string;

  /** What the capability is NOT intended for (negative space is as important as positive). */
  notIntendedFor: string[];

  /** Known limitations a clinician must know before trusting the output. */
  limitations: string[];

  /** Risk class — determines authorization and approval requirements. */
  riskClass: RiskClass;

  /** Write capability. OBSERVE/ANALYZE/RECOMMEND/PREPARE capabilities are 'none'; only EXECUTE may have higher. */
  writeCategory: WriteCategory;

  /** Max autonomy this capability may be invoked at. The Chief may not invoke below this ceiling. */
  maxAutonomyLevel: AutonomyLevel;

  /** Minimum autonomy required to invoke. 'OBSERVE' means anyone can call it read-only. */
  minAutonomyLevel: AutonomyLevel;

  /** Input schema — what the Chief must supply to invoke this capability. */
  inputSchema: Record<string, unknown>;

  /** Output schema — what the capability returns, with field-level descriptions. */
  outputSchema: Record<string, unknown>;

  /** Context required to invoke. A capability that requires a patient context must not run ad-hoc without one. */
  requiredContext: RequiredContext;

  /** Data sources this capability reads from or writes to. Used for provenance and audit. */
  dataSources: string[];

  /** Evidence declaration. */
  evidence: DeclaredEvidence;

  /** Source category this capability's output belongs to (model vs rule vs tool vs fixture). */
  responseSourceCategory: AIResponseSourceCategory;

  /** Whether this capability requires human approval before its output can be acted upon. */
  requiresHumanApproval: boolean;

  /** Which roles may invoke this capability. Empty = policy layer decides. */
  permittedRoles: string[];

  /** Tenant/scope constraints. */
  tenantScope: 'tenant_only' | 'cross_tenant_prohibited' | 'platform';

  /** Patient/encounter binding requirement. 'required' means no ad-hoc invocation without a bound patient/encounter. */
  patientBinding: 'required' | 'optional' | 'none';

  /** Authorization requirements beyond basic role check. */
  authorizationRequirements: string[];

  /** How this capability behaves when it fails. */
  failureMode: FailureMode;

  /** What happens on failure — concrete, not vague. */
  failureBehavior: string;

  /** Whether this capability is currently approved for production use. */
  approved: boolean;

  /** When this capability was last verified/validated. */
  lastVerified: string;

  /** Attestation — who is accountable for this capability's behavior. */
  accountable: string;

  /** Provenance: where this capability's implementation lives. */
  implementationRef: string;

  /** Any special notes for the Chief about how to use this capability safely. */
  usageNotes: string[];

  /** Parent capability, if this is a sub-ability of a larger agent/tool. */
  parentId?: string;

  /** Child capabilities, if this orchestrates subordinate capabilities. */
  childIds?: string[];
}

export interface RequiredContext {
  /** Whether this capability needs a bound patient. */
  patientRequired: boolean;
  /** Whether this capability needs a bound encounter. */
  encounterRequired: boolean;
  /** Whether this capability needs a bound tenant. */
  tenantRequired: boolean;
  /** Whether this capability needs a bound user/role. */
  userRequired: boolean;
  /** Whether this capability can run across patients (e.g., department-level analytics). */
  crossPatient: boolean;
  /** Additional context keys this capability needs (e.g., 'shift', 'queue', 'device_id'). */
  additionalContext?: string[];
}

// ---------------------------------------------------------------------------
// Registry API
// ---------------------------------------------------------------------------

export interface RegistryQuery {
  /** Filter by capability type. */
  capabilityType?: CapabilityType;
  /** Filter by modality. */
  modality?: Modality;
  /** Filter by risk class or lower. */
  maxRiskClass?: RiskClass;
  /** Filter by autonomy level the Chief is currently authorized for. */
  availableAtAutonomyLevel?: AutonomyLevel;
  /** Filter by task/domain keywords in purpose or name. */
  taskKeywords?: string[];
  /** Filter by required context (capability must match the Chief's current context). */
  contextMatch?: {
    patientBound: boolean;
    encounterBound: boolean;
    tenantBound: boolean;
  };
  /** Only capabilities approved for production. */
  approved?: boolean;
  /** Filter by write category — for EXECUTE-level actions, restrict to allowed writes. */
  writeCategory?: WriteCategory;
  /** Filter by permitted roles. */
  permittedRoles?: string[];
  /** Only capabilities that can operate on a bound patient. */
  patientBinding?: 'required' | 'optional' | 'none';
}

export interface CapabilityMatch {
  capability: CapabilityRecord;
  /** Why this capability matched the query. */
  matchReason: string;
  /** Confidence that this capability is appropriate for the task. */
  fit: 'strong' | 'moderate' | 'weak';
}

export function matchesQuery(capability: CapabilityRecord, query: RegistryQuery): CapabilityMatch | null {
  // Risk filter
  if (query.maxRiskClass && riskRank(capability.riskClass) > riskRank(query.maxRiskClass)) {
    return null;
  }

  // Autonomy filter — capability must be invocable at the Chief's current level
  if (query.availableAtAutonomyLevel) {
    const capMin = autonomyRank(capability.minAutonomyLevel);
    const capMax = autonomyRank(capability.maxAutonomyLevel);
    const chiefLevel = autonomyRank(query.availableAtAutonomyLevel);
    if (chiefLevel < capMin || chiefLevel > capMax) {
      return null;
    }
  }

  // Context match
  if (query.contextMatch) {
    const ctx = query.contextMatch;
    if (capability.requiredContext.patientRequired && !ctx.patientBound) {
      return null;
    }
    if (capability.requiredContext.encounterRequired && !ctx.encounterBound) {
      return null;
    }
    if (capability.requiredContext.tenantRequired && !ctx.tenantBound) {
      return null;
    }
  }

  // Approved filter
  if (query.approved !== undefined && capability.approved !== query.approved) {
    return null;
  }

  // Write category filter
  if (query.writeCategory && capability.writeCategory !== query.writeCategory) {
    return null;
  }

  // Role filter
  if (query.permittedRoles && query.permittedRoles.length > 0) {
    if (capability.permittedRoles.length > 0) {
      const allowed = query.permittedRoles.some((r) => capability.permittedRoles.includes(r));
      if (!allowed) return null;
    }
  }

  // Patient binding filter
  if (query.patientBinding && capability.patientBinding !== query.patientBinding) {
    return null;
  }

  // Task keyword filter
  if (query.taskKeywords && query.taskKeywords.length > 0) {
    const haystack = `${capability.name} ${capability.purpose} ${capability.intendedUse}`.toLowerCase();
    const matched = query.taskKeywords.some((kw) => haystack.includes(kw.toLowerCase()));
    if (!matched) return null;
  }

  // Capability type filter
  if (query.capabilityType && capability.capabilityType !== query.capabilityType) {
    return null;
  }

  // Modality filter
  if (query.modality && !capability.modalities.includes(query.modality)) {
    return null;
  }

  // Determine fit
  let fit: 'strong' | 'moderate' | 'weak' = 'weak';
  if (query.taskKeywords && query.taskKeywords.length > 0) {
    const haystack = `${capability.name} ${capability.purpose} ${capability.intendedUse}`.toLowerCase();
    const count = query.taskKeywords.filter((kw) => haystack.includes(kw.toLowerCase())).length;
    if (count === query.taskKeywords.length) fit = 'strong';
    else if (count > 0) fit = 'moderate';
  }

  return {
    capability,
    matchReason: buildMatchReason(capability, query),
    fit,
  };
}

function buildMatchReason(capability: CapabilityRecord, query: RegistryQuery): string {
  const parts: string[] = [];
  if (query.taskKeywords && query.taskKeywords.length > 0) {
    parts.push(`matches task keywords`);
  }
  if (capability.requiredContext.patientRequired) parts.push(`requires patient context`);
  if (capability.requiredContext.encounterRequired) parts.push(`requires encounter context`);
  if (capability.riskClass !== 'none') parts.push(`risk class: ${capability.riskClass}`);
  parts.push(`modalities: ${capability.modalities.join('; ')}`);
  if (capability.requiresHumanApproval) parts.push(`requires human approval`);
  return parts.join('; ') || 'registry match';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskRank(risk: RiskClass): number {
  return RISK_CLASSES.indexOf(risk);
}

function autonomyRank(level: AutonomyLevel): number {
  return AUTONOMY_LEVELS.indexOf(level);
}

// ---------------------------------------------------------------------------
// Singleton registry
// ---------------------------------------------------------------------------

let _capabilities: CapabilityRecord[] = [];

/**
 * Register a capability. Called at module init time. Must be idempotent.
 */
export function registerCapability(capability: CapabilityRecord): void {
  const existing = _capabilities.find((c) => c.id === capability.id);
  if (existing) {
    // Update in place — version may increment without a full re-registration sweep.
    Object.assign(existing, capability);
    return;
  }
  _capabilities.push(capability);
}

/**
 * Get all registered capabilities.
 */
export function getCapabilities(): readonly CapabilityRecord[] {
  return _capabilities;
}

/**
 * Query the registry. Returns capabilities the Chief can discover and potentially
 * invoke given the current context, autonomy level, and policy constraints.
 *
 * This is the PRIMARY interface between the Chief and the capability fabric.
 * The Chief never reaches into the backend directly — it asks the registry what
 * is available, then invokes through the selected capability's declared contract.
 */
export function queryCapabilities(query: RegistryQuery): CapabilityMatch[] {
  return _capabilities
    .map((c) => matchesQuery(c, query))
    .filter((m): m is CapabilityMatch => m !== null)
    .sort((a, b) => {
      const rank = { strong: 0, moderate: 1, weak: 2 } as const;
      return rank[a.fit] - rank[b.fit];
    });
}

/**
 * Get a single capability by id. Returns undefined if not found — the Chief
 * must never assume an id is valid.
 */
export function getCapability(id: string): CapabilityRecord | undefined {
  return _capabilities.find((c) => c.id === id);
}

/**
 * Validate that a capability exists and is approved before the Chief attempts
 * to invoke it. Throws if the capability is not found or not approved.
 *
 * This is the gate between discovery and invocation — every invocation path
 * must pass through this check (or an equivalent policy check), never skip it.
 */
export function assertCapabilityUsable(id: string): CapabilityRecord {
  const cap = getCapability(id);
  if (!cap) {
    throw new Error(`Capability not found: ${id}`);
  }
  if (!cap.approved) {
    throw new Error(`Capability not approved for use: ${id} (approved: ${cap.approved})`);
  }
  return cap;
}

/**
 * Reset the registry. For tests only.
 */
export function resetRegistry(): void {
  _capabilities = [];
}
