import { buildProfileToolGraph, buildUserToolProfile } from './profileToolSegmentation';
import { applySaasResonanceToToolProfile, resolveSaasToolResonance } from '../config/saasProfileToolResonance';
import { compileUserProfile } from '../config/userProfileCompiler';

export const ROLE_INTELLIGENCE_SIGNALS = Object.freeze({
  ASSET_USAGE: 'role_asset_usage',
  SEARCH_BEHAVIOR: 'role_search_behavior',
  AI_REQUEST: 'role_ai_request',
  SIMULATION_COMPLETED: 'role_simulation_completed',
  WORKFLOW_LAUNCHED: 'role_workflow_launched',
});

const ROLE_DISPLAY_NAMES = Object.freeze({
  'emergency physician': 'Emergency Physician',
  nurse: 'Nurse',
  cardiologist: 'Cardiologist',
  researcher: 'Researcher',
  administrator: 'Administrator',
  'biomedical engineer': 'Biomedical Engineer',
  hospitalist: 'Hospitalist',
  'ICU clinician': 'ICU Clinician',
  'pediatric clinician': 'Pediatric Clinician',
  pharmacist: 'Pharmacist',
  'fleet operator': 'Fleet Operator',
  'medical student': 'Medical Student',
});

const ROLE_ALIASES = Object.freeze({
  emergencyphysician: 'emergency physician',
  emergencymedicine: 'emergency physician',
  edphysician: 'emergency physician',
  physician: 'hospitalist',
  clinician: 'hospitalist',
  doctor: 'hospitalist',
  rn: 'nurse',
  nurse: 'nurse',
  cardiologist: 'cardiologist',
  cardiology: 'cardiologist',
  researcher: 'researcher',
  research: 'researcher',
  administrator: 'administrator',
  admin: 'administrator',
  biomedicalengineer: 'biomedical engineer',
  biomed: 'biomedical engineer',
  fleetoperator: 'fleet operator',
  dispatcher: 'fleet operator',
  pharmacist: 'pharmacist',
  student: 'medical student',
  medicalstudent: 'medical student',
});

const ROLE_TERMS = Object.freeze({
  'emergency physician': [
    'emergency',
    'ed ',
    'triage',
    'sepsis',
    'stroke',
    'trauma',
    'qsofa',
    'news2',
    'heart',
    'nihss',
    'perc',
    'wells',
    'resuscitation',
  ],
  nurse: [
    'nurse',
    'nursing',
    'bedside',
    'handoff',
    'medication safety',
    'fall',
    'braden',
    'morse',
    'lab escalation',
    'workflow',
  ],
  cardiologist: [
    'cardio',
    'cardiology',
    'acs',
    'chest pain',
    'heart',
    'timi',
    'grace',
    'has-bled',
    'chads',
    'ecg',
  ],
  researcher: ['research', 'evidence', 'guideline', 'rag', 'analytics', 'study', 'cohort', 'literature'],
  administrator: [
    'admin',
    'governance',
    'audit',
    'analytics',
    'operations',
    'security',
    'cost',
    'configuration',
    'tenant',
  ],
  'biomedical engineer': [
    'biomedical',
    'device',
    'iot',
    'telemetry',
    'alarm',
    'maintenance',
    'fleet',
    'battery',
    'sensor',
  ],
  hospitalist: ['inpatient', 'hospital', 'handoff', 'protocol', 'rounding', 'clinical'],
  'ICU clinician': ['icu', 'critical care', 'ventilator', 'shock', 'sofa', 'respiratory', 'sepsis'],
  'pediatric clinician': ['pediatric', 'child', 'neonatal', 'fever', 'ob/gyn', 'pediatrics'],
  pharmacist: ['drug', 'medication', 'dose', 'dosing', 'pharmacy', 'antibiotic', 'interaction'],
  'fleet operator': ['fleet', 'dispatch', 'route', 'map', 'transport', 'ems', 'logistics'],
  'medical student': ['student', 'education', 'training', 'simulation', 'osce', 'tutor'],
});

const ROLE_AGENT_SEEDS = Object.freeze({
  'emergency physician': ['agent-emergency', 'agent-clinical'],
  nurse: ['agent-clinical', 'agent-education'],
  cardiologist: ['agent-clinical'],
  researcher: ['agent-research', 'agent-clinical'],
  administrator: ['agent-governance', 'agent-operations'],
  'biomedical engineer': ['agent-operations', 'agent-fleet'],
  'fleet operator': ['agent-fleet', 'agent-operations'],
  pharmacist: ['agent-lab', 'agent-clinical'],
  'medical student': ['agent-education', 'agent-clinical'],
});

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function unique(values) {
  return [...new Set(list(values).filter(Boolean))];
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function includesAny(text, terms = [] as any[]) {
  return terms.some((term) => text.includes(term));
}

function entityText(entity) {
  return [
    entity?.id,
    entity?.assetId,
    entity?.title,
    entity?.name,
    entity?.label,
    entity?.description,
    entity?.category,
    entity?.assetType,
    entity?.type,
    entity?.route,
    entity?.launchType,
    entity?.specialty,
    ...list(entity?.targetRoles),
    ...list(entity?.intendedRoles),
    ...list(entity?.roleAwareness),
    ...list(entity?.workspaceAwareness),
    ...list(entity?.workspaceTags),
    ...list(entity?.capabilities),
    ...list(entity?.defaultModules),
    ...list(entity?.aliases),
    ...list(entity?.features),
    ...list(entity?.useCases),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function normalizeRole(value, fallback = 'medical student') {
  const raw = String(value || fallback || '').trim();
  if (!raw) return 'medical student';
  const direct = ROLE_DISPLAY_NAMES[raw] ? raw : null;
  if (direct) return direct;
  return ROLE_ALIASES[normalizeKey(raw)] || normalizeText(raw) || 'medical student';
}

export function getRoleDisplayName(role) {
  const normalized = normalizeRole(role);
  return ROLE_DISPLAY_NAMES[normalized] || normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildRoleIntelligenceProfile({
  account,
  user,
  preferences,
  activeWorkspace,
  workspaceState,
  toolPreferences,
  permissions,
  profile,
  roleProfile,
  platformContext,
  activity,
}: any = {}) {
  const saasRoleId = roleProfile?.id || platformContext?.roleProfile?.id || platformContext?.saasRole;
  const saasResonance = saasRoleId ? resolveSaasToolResonance(saasRoleId) : null;
  const compiledProfile = saasRoleId
    ? compileUserProfile({
        saasRole: saasRoleId,
        entitlementContext: platformContext,
      })
    : null;
  const baseProfile =
    profile ||
    buildUserToolProfile({
      account,
      user,
      preferences,
      activeWorkspace,
      activeWorkspaceId: workspaceState?.activeWorkspaceId,
      toolPreferences,
      permissions,
    });
  const mergedProfile = saasRoleId ? applySaasResonanceToToolProfile(baseProfile, saasRoleId) : baseProfile;
  const role = normalizeRole(mergedProfile.role || roleProfile?.label || roleProfile?.id || baseProfile.role);
  const workspaceId =
    activeWorkspace?.id ||
    workspaceState?.activeWorkspaceId ||
    mergedProfile.workspace ||
    platformContext?.workspace?.activeWorkspaceId ||
    'all';

  return {
    ...mergedProfile,
    role,
    roleLabel: saasResonance?.profileCopy.personaTitle || getRoleDisplayName(role),
    roleProfileId: roleProfile?.id || saasRoleId,
    saasRole: saasRoleId || mergedProfile.saasRole,
    toolsTitle: saasResonance?.toolsTitle,
    toolsSubtitle: saasResonance?.toolsSubtitle,
    operationsEyebrow: saasResonance?.operationsEyebrow,
    workspace: workspaceId,
    workspaceId,
    workspaceLabel: activeWorkspace?.name || platformContext?.workspace?.activeWorkspaceId || workspaceId,
    entitledAssetIds: platformContext?.entitledAssetIds || [],
    entitledPackIds: platformContext?.entitledPackIds || [],
    defaultAiAgentId: platformContext?.defaultAiAgentId,
    behaviorSignals: buildRoleBehaviorSignals({ activity, toolPreferences, preferences }),
    compiledProfile,
  };
}

export function buildRoleBehaviorSignals({ activity, toolPreferences, preferences }: any = {}) {
  const recentTools = unique([
    ...list(toolPreferences?.recentTools),
    ...list(preferences?.toolPreferences?.recentToolIds),
    ...list(activity?.recentTools).map((item) => item.metadata?.toolId || item.id),
  ]);
  const recentAiChats = list(activity?.recentAiChats);
  const completedSimulationIds = unique(
    list(activity?.simulationsCompleted || activity?.recentSimulations).map(
      (item) => item.scenarioId || item.id,
    ),
  );
  const workflowIds = unique(
    list(activity?.workflowsLaunched || activity?.recentWorkflows).map((item) => item.workflowId || item.id),
  );

  return {
    recentAssetIds: recentTools,
    recentAssetCount: recentTools.length,
    aiRequestCount: recentAiChats.length,
    completedSimulationIds,
    completedSimulationCount: completedSimulationIds.length,
    workflowIds,
    workflowLaunchCount: workflowIds.length,
  };
}

export function buildRoleTelemetryContext(profile: any = {}) {
  return {
    role: profile.role,
    roleLabel: profile.roleLabel || getRoleDisplayName(profile.role),
    specialty: profile.specialty,
    department: profile.department,
    workspaceId: profile.workspaceId || profile.workspace,
    roleProfileId: profile.roleProfileId,
  };
}

function scoreEntityForRole(entity, profile, options: any = {}) {
  const role = normalizeRole(profile?.role);
  const text = entityText(entity);
  const reasons = [] as any[];
  let score = 0;

  const roles = [
    ...list(entity?.targetRoles),
    ...list(entity?.intendedRoles),
    ...list(entity?.roleAwareness),
    ...list(entity?.roleMapping).map((roleMapping) => roleMapping.label || roleMapping.roleProfileId),
  ].map((value) => normalizeRole(value));
  if (roles.includes(role)) {
    score += 60;
    reasons.push(`${getRoleDisplayName(role)} role match`);
  }

  const terms = ROLE_TERMS[role] || [];
  if (includesAny(text, terms)) {
    score += 30;
    reasons.push(`${getRoleDisplayName(role)} workflow fit`);
  }

  if (profile?.specialty && text.includes(normalizeText(profile.specialty))) {
    score += 18;
    reasons.push(`${profile.specialty} specialty fit`);
  }

  if (profile?.workspace && text.includes(normalizeText(profile.workspace).replace(/-/g, ' '))) {
    score += 12;
    reasons.push('Active workspace fit');
  }

  if (options.preferredIds?.includes(entity?.id || entity?.assetId)) {
    score += 14;
    reasons.push('Preferred by this user');
  }

  if (options.recentIds?.includes(entity?.id || entity?.assetId)) {
    score += 8;
    reasons.push('Recent activity');
  }

  if (options.seedIds?.includes(entity?.id || entity?.assetId)) {
    score += 35;
    reasons.push('Default role recommendation');
  }

  if (options.installedIds?.includes(entity?.id)) {
    score += 6;
    reasons.push('Already enabled');
  }

  if (options.completedIds?.includes(entity?.id)) {
    score -= 12;
    reasons.push('Already completed recently');
  }

  return {
    score,
    reason: reasons[0] || `${getRoleDisplayName(role)} discovery fit`,
    reasons: unique(reasons),
    recommended: score >= (options.threshold || 30),
  };
}

export function getRoleIntelligenceAssetRecommendations({ tools = [] as any[], profile, limit = 12 }: any = {}) {
  const graph = buildProfileToolGraph({ tools, profile });
  return graph.recommendedTools.slice(0, limit).map((tool) => ({
    id: tool.id,
    title: tool.name || tool.label || tool.id,
    route: tool.path || tool.navigationPath,
    category: tool.category,
    score: tool.profileScore,
    reason: `${profile?.roleLabel || getRoleDisplayName(profile?.role)} profile match`,
    asset: tool,
  }));
}

export function getRoleIntelligencePackRecommendations({
  packs = [] as any[],
  profile,
  installedPackIds = [] as any[],
  limit = 6,
}: any = {}) {
  return list(packs)
    .map((pack) => {
      const roleIntelligence = scoreEntityForRole(pack, profile, {
        installedIds: installedPackIds,
        threshold: 24,
      });
      return { ...pack, roleIntelligence };
    })
    .sort((a, b) => {
      const installedDelta = Number(Boolean(a.enabled)) - Number(Boolean(b.enabled));
      return b.roleIntelligence.score - a.roleIntelligence.score || installedDelta || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function getRoleIntelligenceSimulationRecommendations({
  scenarios = [] as any[],
  profile,
  completedScenarioIds = [] as any[],
  limit = 6,
}: any = {}) {
  return list(scenarios)
    .map((scenario) => {
      const roleIntelligence = scoreEntityForRole(scenario, profile, {
        completedIds: completedScenarioIds,
        threshold: 30,
      });
      return { ...scenario, roleIntelligence };
    })
    .filter((scenario) => scenario.roleIntelligence.recommended)
    .sort((a, b) => b.roleIntelligence.score - a.roleIntelligence.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function getRoleIntelligenceAgentRecommendations({ agents = [] as any[], profile, limit = 4 }: any = {}) {
  const seedIds = ROLE_AGENT_SEEDS[normalizeRole(profile?.role)] || [];
  return list(agents)
    .map((agent) => {
      const roleIntelligence = scoreEntityForRole(agent, profile, {
        seedIds,
        threshold: 25,
      });
      return { ...agent, roleIntelligence };
    })
    .filter((agent) => agent.roleIntelligence.recommended)
    .sort((a, b) => b.roleIntelligence.score - a.roleIntelligence.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function buildSafeSearchBehaviorPayload({ search, resultCount, filter, profile }: any = {}) {
  return {
    ...buildRoleTelemetryContext(profile),
    searchLength: String(search || '').trim().length,
    hasSearch: String(search || '').trim().length > 0,
    resultCount: Number.isFinite(resultCount) ? resultCount : 0,
    filter: filter || 'all',
  };
}
