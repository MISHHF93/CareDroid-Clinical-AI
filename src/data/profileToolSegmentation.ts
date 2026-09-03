const ADMIN_PERMISSIONS = Object.freeze([
  'CONFIGURE_SYSTEM',
  'MANAGE_USERS',
  'VIEW_AUDIT_LOGS',
  'VIEW_GOVERNANCE',
  'VIEW_AI_SECURITY',
  'VIEW_OPERATIONS',
  'VIEW_OBSERVABILITY',
  'VIEW_REVIEW_QUEUE',
  'REVIEW_CLINICAL_AI',
  'MANAGE_INCIDENTS',
]);

const CLINICAL_PERMISSIONS = Object.freeze([
  'READ_PHI',
  'USE_CALCULATORS',
  'USE_DRUG_CHECKER',
  'USE_LAB_INTERPRETER',
  'USE_PROTOCOLS',
  'USE_AI_CHAT',
]);

const STUDENT_PERMISSIONS = Object.freeze([
  'USE_CALCULATORS',
  'USE_DRUG_CHECKER',
  'USE_LAB_INTERPRETER',
  'USE_PROTOCOLS',
  'USE_AI_CHAT',
]);

const OPERATIONS_DISCOVERY_PERMISSIONS = new Set([
  'VIEW_OPERATIONS',
  'VIEW_OBSERVABILITY',
  'VIEW_ANALYTICS',
  'CONFIGURE_SYSTEM',
]);

export const PROFILE_ROLES = Object.freeze([
  'emergency physician',
  'hospitalist',
  'cardiologist',
  'nurse',
  'ICU clinician',
  'pediatric clinician',
  'pharmacist',
  'fleet operator',
  'biomedical engineer',
  'administrator',
  'researcher',
  'medical student',
]);

export const PROFILE_SPECIALTIES = Object.freeze([
  'emergency medicine',
  'hospital medicine',
  'cardiology',
  'critical care',
  'pediatrics',
  'pharmacy',
  'operations',
  'biomedical engineering',
  'administration',
  'research',
  'medical education',
]);

export const PROFILE_DEPARTMENTS = Object.freeze([
  'emergency',
  'inpatient',
  'cardiology',
  'ICU',
  'pediatrics',
  'pharmacy',
  'operations',
  'biomedical engineering',
  'administration',
  'research',
]);

export const PROFILE_TRAINING_LEVELS = Object.freeze([
  'student',
  'resident',
  'fellow',
  'attending',
  'operator',
  'administrator',
]);

export const ORGANIZATION_TYPES = Object.freeze([
  'hospital',
  'academic medical center',
  'clinic',
  'EMS',
  'research institute',
  'health system',
]);

const ROLE_ALIASES = Object.freeze({
  admin: 'administrator',
  administrator: 'administrator',
  physician: 'hospitalist',
  doctor: 'hospitalist',
  clinician: 'hospitalist',
  hospitalist: 'hospitalist',
  nurse: 'nurse',
  rn: 'nurse',
  student: 'medical student',
  medicalstudent: 'medical student',
  emergencymedicine: 'emergency physician',
  emergencyphysician: 'emergency physician',
  edphysician: 'emergency physician',
  intensivist: 'ICU clinician',
  icuclinician: 'ICU clinician',
  criticalcare: 'ICU clinician',
  cardiologist: 'cardiologist',
  pediatrician: 'pediatric clinician',
  pediatricclinician: 'pediatric clinician',
  pharmacist: 'pharmacist',
  fleetoperator: 'fleet operator',
  dispatcher: 'fleet operator',
  biomedicalengineer: 'biomedical engineer',
  biomed: 'biomedical engineer',
  researcher: 'researcher',
});

const SPECIALTY_ALIASES = Object.freeze({
  emergency: 'emergency medicine',
  emergencymedicine: 'emergency medicine',
  cardiology: 'cardiology',
  criticalcare: 'critical care',
  intensivecare: 'critical care',
  icu: 'critical care',
  hospitalmedicine: 'hospital medicine',
  internalmedicine: 'hospital medicine',
  pediatrics: 'pediatrics',
  pediatric: 'pediatrics',
  pharmacy: 'pharmacy',
  operations: 'operations',
  fleet: 'operations',
  biomedicalengineering: 'biomedical engineering',
  administration: 'administration',
  admin: 'administration',
  research: 'research',
});

const ROLE_DEFAULTS = Object.freeze({
  'emergency physician': {
    specialty: 'emergency medicine',
    department: 'emergency',
    permissionLevel: 'clinician',
    permissions: [...CLINICAL_PERMISSIONS, 'TRIGGER_EMERGENCY_PROTOCOL', 'REVIEW_CLINICAL_AI'],
  },
  hospitalist: {
    specialty: 'hospital medicine',
    department: 'inpatient',
    permissionLevel: 'clinician',
    permissions: [...CLINICAL_PERMISSIONS, 'REVIEW_CLINICAL_AI'],
  },
  cardiologist: {
    specialty: 'cardiology',
    department: 'cardiology',
    permissionLevel: 'clinician',
    permissions: [...CLINICAL_PERMISSIONS, 'REVIEW_CLINICAL_AI'],
  },
  nurse: {
    specialty: 'hospital medicine',
    department: 'inpatient',
    permissionLevel: 'clinician',
    permissions: CLINICAL_PERMISSIONS,
  },
  'ICU clinician': {
    specialty: 'critical care',
    department: 'ICU',
    permissionLevel: 'clinician',
    permissions: [...CLINICAL_PERMISSIONS, 'TRIGGER_EMERGENCY_PROTOCOL', 'REVIEW_CLINICAL_AI'],
  },
  'pediatric clinician': {
    specialty: 'pediatrics',
    department: 'pediatrics',
    permissionLevel: 'clinician',
    permissions: [...CLINICAL_PERMISSIONS, 'REVIEW_CLINICAL_AI'],
  },
  pharmacist: {
    specialty: 'pharmacy',
    department: 'pharmacy',
    permissionLevel: 'clinician',
    permissions: [
      'READ_PHI',
      'USE_CALCULATORS',
      'USE_DRUG_CHECKER',
      'USE_PROTOCOLS',
      'USE_AI_CHAT',
    ],
  },
  'fleet operator': {
    specialty: 'operations',
    department: 'operations',
    permissionLevel: 'operations',
    permissions: ['VIEW_OPERATIONS', 'USE_AI_CHAT'],
  },
  'biomedical engineer': {
    specialty: 'biomedical engineering',
    department: 'biomedical engineering',
    permissionLevel: 'operations',
    permissions: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY', 'USE_AI_CHAT'],
  },
  administrator: {
    specialty: 'administration',
    department: 'administration',
    permissionLevel: 'admin',
    permissions: [...new Set([...ADMIN_PERMISSIONS, ...CLINICAL_PERMISSIONS])],
  },
  researcher: {
    specialty: 'research',
    department: 'research',
    permissionLevel: 'research',
    permissions: ['USE_CALCULATORS', 'USE_PROTOCOLS', 'USE_AI_CHAT', 'VIEW_ANALYTICS'],
  },
  'medical student': {
    specialty: 'medical education',
    department: 'inpatient',
    permissionLevel: 'learner',
    permissions: STUDENT_PERMISSIONS,
  },
});

const PROFILE_ASSISTANT_SEEDS = Object.freeze({
  'emergency physician': ['heart-score', 'nihss', 'qsofa', 'perc'],
  cardiologist: ['cha2ds2-vasc', 'has-bled', 'grace-acs', 'timi-ua-nstemi'],
  'fleet operator': ['fleet-command', 'dispatch-ai', 'predictive-maintenance', 'route-optimizer'],
});

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeProfileRole(value) {
  const key = normalizeKey(value);
  return (
    ROLE_ALIASES[key] ||
    ROLE_ALIASES[normalizeKey(String(value || '').replace(/_/g, ' '))] ||
    'medical student'
  );
}

export function normalizeSpecialty(value, fallback = 'medical education') {
  const key = normalizeKey(value);
  return SPECIALTY_ALIASES[key] || normalizeText(value) || fallback;
}

function inferRole({ account, user, toolProfileSettings }) {
  return normalizeProfileRole(
    toolProfileSettings?.role ||
      account?.role ||
      account?.profession ||
      user?.profile?.profession ||
      user?.role ||
      'medical student',
  );
}

export function buildUserToolProfile(
  {
    account,
    user,
    preferences,
    activeWorkspace,
    activeWorkspaceId,
    toolPreferences = {} as any,
    permissions,
  } = {} as any,
) {
  const toolProfileSettings = toolPreferences.profileSettings || {};
  const preferencesToolPrefs = preferences?.toolPreferences || {};
  const role = inferRole({ account, user, toolProfileSettings });
  const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS['medical student'];
  const specialty = normalizeSpecialty(
    toolProfileSettings.specialty || account?.specialty || user?.profile?.specialty,
    defaults.specialty,
  );
  const department = normalizeText(
    toolProfileSettings.department || account?.department || defaults.department,
  );
  const permissionLevel = toolProfileSettings.permissionLevel || defaults.permissionLevel;
  const workspace =
    toolProfileSettings.defaultWorkspace ||
    activeWorkspace?.id ||
    activeWorkspaceId ||
    preferences?.defaultWorkspace ||
    'all';

  return {
    role,
    specialty,
    department,
    workspace,
    permissionLevel,
    permissions: unique([...list(permissions), ...list(defaults.permissions)]),
    preferredTools: unique([
      ...list(toolPreferences.favorites),
      ...list(preferencesToolPrefs.favoriteToolIds),
    ]),
    recentTools: unique([
      ...list(toolPreferences.recentTools),
      ...list(preferencesToolPrefs.recentToolIds),
    ]),
    pinnedTools: unique([
      ...list(toolPreferences.pinned),
      ...list(preferencesToolPrefs.pinnedToolIds),
    ]),
    hiddenTools: unique([
      ...list(toolPreferences.hiddenTools),
      ...list(preferencesToolPrefs.hiddenToolIds),
    ]),
    clinicalAccess: ['clinician', 'admin', 'learner', 'research'].includes(permissionLevel),
    operationsAccess:
      ['operations', 'admin'].includes(permissionLevel) ||
      defaults.permissions?.includes('VIEW_OPERATIONS'),
    trainingLevel:
      toolProfileSettings.trainingLevel ||
      (permissionLevel === 'learner' ? 'student' : defaults.permissionLevel),
    organizationType:
      toolProfileSettings.organizationType || account?.organizationType || 'hospital',
    compactToolView: Boolean(toolProfileSettings.compactToolView),
  };
}

function toolText(tool) {
  return [
    tool.id,
    tool.name,
    tool.label,
    tool.description,
    tool.category,
    tool.surface,
    tool.launchType,
    tool.tier,
    tool.searchText,
    ...(tool.features || []),
    ...(tool.useCases || []),
    ...(tool.aliases || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

export function deriveToolSegmentationMetadata(tool) {
  const text = toolText(tool);
  const category = normalizeText(tool.category);
  const isCalculator = category === 'calculator' || tool.surface === 'calculator-form';
  const isFleet =
    category === 'fleet' ||
    tool.surface === 'fleet-page' ||
    matchesAny(text, ['fleet', 'dispatch', 'route optimizer', 'predictive maintenance']);
  const isIot =
    category === 'iot' ||
    tool.surface === 'iot-dashboard' ||
    matchesAny(text, ['iot', 'device', 'telemetry', 'biomedical']);
  const isOperations =
    category === 'hospital operations' ||
    tool.surface === 'hospital-operations' ||
    matchesAny(text, ['hospital command', 'operations', 'occupancy', 'resource allocation']);
  const isSimulation =
    category === 'education & simulation' ||
    matchesAny(text, ['simulation', 'scenario', 'debrief', 'competency', 'training']);
  const isAdmin = matchesAny(text, [
    'governance',
    'security',
    'audit',
    'regulatory',
    'privacy',
    'observability',
    'system health',
    'validation',
  ]);
  const isCardiology = matchesAny(text, [
    'cardio',
    'heart',
    'acs',
    'stemi',
    'timi',
    'grace',
    'chads',
    'cha2ds2',
    'has-bled',
    'ecg',
    'atrial',
    'arrhythmia',
  ]);
  const isEmergency = matchesAny(text, [
    'emergency',
    'trauma',
    'qsofa',
    'sofa',
    'news2',
    'perc',
    'wells',
    'nihss',
    'stroke',
    'sepsis',
    'heart score',
  ]);
  const isPediatric = matchesAny(text, [
    'pediatric',
    'neonatal',
    'child',
    'pregnancy',
    'ob ',
    'obgyn',
  ]);
  const isPharmacy = matchesAny(text, [
    'drug',
    'medication',
    'antibiotic',
    'pharmac',
    'dose',
    'dosing',
  ]);
  const isResearch = matchesAny(text, ['research', 'analytics', 'evidence', 'guideline', 'rag']);
  const isClinicalAi = matchesAny(text, [
    'ai',
    'assistant',
    'scribe',
    'summary',
    'differential',
    'order set',
    'timeline',
  ]);

  const intendedRoles = [] as any[];
  const specialties = [] as any[];
  const departments = [] as any[];
  const workspaceTags = [] as any[];
  const requiredPermissions = [] as any[];

  if (isAdmin) {
    intendedRoles.push('administrator');
    specialties.push('administration');
    departments.push('administration');
    workspaceTags.push('admin');
    requiredPermissions.push(
      text.includes('security')
        ? 'VIEW_AI_SECURITY'
        : text.includes('governance')
          ? 'VIEW_GOVERNANCE'
          : 'VIEW_AUDIT_LOGS',
    );
  }

  if (isFleet) {
    intendedRoles.push('fleet operator', 'administrator');
    specialties.push('operations');
    departments.push('operations');
    workspaceTags.push('fleet', 'operations');
    requiredPermissions.push('VIEW_OPERATIONS');
  }

  if (isIot) {
    intendedRoles.push('biomedical engineer', 'ICU clinician', 'nurse', 'administrator');
    specialties.push('biomedical engineering', 'critical care', 'operations');
    departments.push('biomedical engineering', 'ICU', 'operations');
    workspaceTags.push('iot', 'operations', 'hospital-operations');
    requiredPermissions.push('VIEW_OPERATIONS');
  }

  if (isOperations && !isFleet) {
    intendedRoles.push('administrator', 'ICU clinician', 'nurse', 'biomedical engineer');
    specialties.push('operations', 'critical care');
    departments.push('operations', 'ICU');
    workspaceTags.push('hospital-operations', 'operations');
    requiredPermissions.push('VIEW_OPERATIONS');
  }

  if (isSimulation) {
    intendedRoles.push(
      'emergency physician',
      'nurse',
      'medical student',
      'ICU clinician',
      'biomedical engineer',
      'fleet operator',
    );
    specialties.push('emergency medicine', 'critical care', 'medical education', 'operations');
    departments.push('emergency', 'ICU', 'operations', 'biomedical engineering');
    workspaceTags.push('simulation', 'education', 'clinical', 'training');
    requiredPermissions.push('USE_AI_CHAT');
  }

  if (isCardiology) {
    intendedRoles.push('cardiologist', 'emergency physician', 'hospitalist');
    specialties.push('cardiology', 'emergency medicine', 'hospital medicine');
    departments.push('cardiology', 'emergency', 'inpatient');
    workspaceTags.push('cardiology', 'clinical');
  }

  if (isEmergency) {
    intendedRoles.push('emergency physician', 'ICU clinician', 'nurse', 'hospitalist');
    specialties.push('emergency medicine', 'critical care');
    departments.push('emergency', 'ICU');
    workspaceTags.push('emergency', 'clinical');
  }

  if (isPediatric) {
    intendedRoles.push('pediatric clinician', 'nurse', 'medical student');
    specialties.push('pediatrics');
    departments.push('pediatrics');
    workspaceTags.push('pediatrics', 'clinical');
  }

  if (isPharmacy) {
    intendedRoles.push('pharmacist', 'hospitalist', 'emergency physician', 'nurse');
    specialties.push('pharmacy', 'hospital medicine', 'emergency medicine');
    departments.push('pharmacy', 'inpatient', 'emergency');
    workspaceTags.push('pharmacy', 'clinical');
    requiredPermissions.push('USE_DRUG_CHECKER');
  }

  if (isResearch) {
    intendedRoles.push('researcher', 'medical student', 'hospitalist');
    specialties.push('research', 'medical education');
    departments.push('research');
    workspaceTags.push('research', 'reference');
  }

  if (
    !intendedRoles.length &&
    (isCalculator ||
      category === 'diagnostic' ||
      category === 'reference' ||
      category === 'clinical ai')
  ) {
    intendedRoles.push(
      'emergency physician',
      'hospitalist',
      'nurse',
      'ICU clinician',
      'medical student',
    );
    specialties.push(
      'emergency medicine',
      'hospital medicine',
      'critical care',
      'medical education',
    );
    departments.push('emergency', 'inpatient', 'ICU');
    workspaceTags.push('clinical');
  }

  if (isCalculator) {
    workspaceTags.push('calculator');
    requiredPermissions.push('USE_CALCULATORS');
  }
  if (category === 'reference') workspaceTags.push('reference');
  if (category === 'education & simulation') workspaceTags.push('simulation', 'education');
  if (category === 'diagnostic') workspaceTags.push('diagnostic');
  if (isClinicalAi) requiredPermissions.push('USE_AI_CHAT');
  if (tool.launchType === 'backend-backed' || tool.executorStatus === 'registered')
    requiredPermissions.push('USE_AI_CHAT');

  const clinicalRiskLevel =
    tool.clinicalRiskLevel ||
    (isAdmin ||
    (isClinicalAi && matchesAny(text, ['differential', 'order set', 'summary', 'scribe']))
      ? 'high'
      : isCalculator || isClinicalAi || tool.launchType === 'backend-backed'
        ? 'medium'
        : 'low');
  const requiresHumanReview =
    clinicalRiskLevel === 'high' ||
    matchesAny(text, ['human review', 'order set', 'differential', 'dispatch']);
  const hiddenFor = isAdmin
    ? [
        'medical student',
        'nurse',
        'hospitalist',
        'cardiologist',
        'emergency physician',
        'ICU clinician',
        'pediatric clinician',
        'pharmacist',
        'researcher',
      ]
    : [];

  return {
    intendedRoles: unique(intendedRoles.length ? intendedRoles : PROFILE_ROLES),
    specialties: unique(specialties),
    departments: unique(departments),
    workspaceTags: unique(workspaceTags.length ? workspaceTags : ['clinical']),
    requiredPermissions: unique([
      ...(tool.permissionPolicy?.permissions || []),
      ...requiredPermissions,
    ]),
    clinicalRiskLevel,
    defaultVisible: !isAdmin,
    recommendedFor: unique([...intendedRoles, ...specialties]),
    hiddenFor,
    requiresBackend: Boolean(
      tool.requiresBackend ||
      tool.launchType === 'backend-backed' ||
      tool.executorStatus === 'registered' ||
      tool.executorStatus === 'platform',
    ),
    requiresHumanReview,
  };
}

export function enrichToolWithSegmentation(tool) {
  const segmentation = tool.segmentation || deriveToolSegmentationMetadata(tool);
  return {
    ...tool,
    segmentation,
    intendedRoles: segmentation.intendedRoles,
    specialties: segmentation.specialties,
    departments: segmentation.departments,
    workspaceTags: segmentation.workspaceTags,
    requiredPermissions: segmentation.requiredPermissions,
    clinicalRiskLevel: segmentation.clinicalRiskLevel,
    defaultVisible: segmentation.defaultVisible,
    recommendedFor: segmentation.recommendedFor,
    hiddenFor: segmentation.hiddenFor,
    requiresBackend: segmentation.requiresBackend,
    requiresHumanReview: segmentation.requiresHumanReview,
  };
}

function hasRequiredPermissions(profile, metadata) {
  if (profile.permissionLevel === 'admin') return true;
  const required = metadata.requiredPermissions || [];
  if (!required.length) return true;
  const permissionSet = new Set(profile.permissions || []);
  if (
    metadata.workspaceTags?.some((tag) =>
      ['fleet', 'operations', 'iot', 'hospital-operations'].includes(tag),
    )
  ) {
    const nonDiscoveryPermissions = required.filter(
      (permission) => !OPERATIONS_DISCOVERY_PERMISSIONS.has(permission),
    );
    return nonDiscoveryPermissions.every((permission) => permissionSet.has(permission));
  }
  return required.every((permission) => permissionSet.has(permission));
}

export function getToolRestrictionReason(tool, profile) {
  const metadata = tool.segmentation || deriveToolSegmentationMetadata(tool);
  if ((profile.hiddenTools || []).includes(tool.id)) return 'Hidden by user preference';
  if (metadata.hiddenFor?.includes(profile.role)) return `Hidden for ${profile.role}`;
  if (!profile.operationsAccess && metadata.workspaceTags?.includes('admin')) {
    return 'Requires operations access';
  }
  if (!profile.clinicalAccess && metadata.workspaceTags?.includes('clinical')) {
    return 'Requires clinical access';
  }
  if (!hasRequiredPermissions(profile, metadata)) {
    return `Requires ${metadata.requiredPermissions.join(', ')}`;
  }
  if (
    metadata.requiresHumanReview &&
    metadata.clinicalRiskLevel === 'high' &&
    !['admin', 'clinician', 'operations'].includes(profile.permissionLevel)
  ) {
    return 'Requires clinical human-review permission';
  }
  return '';
}

export function isToolAllowedForProfile(tool, profile) {
  return !getToolRestrictionReason(tool, profile);
}

export function scoreToolForProfile(tool, profile) {
  const metadata = tool.segmentation || deriveToolSegmentationMetadata(tool);
  if ((profile.hiddenTools || []).includes(tool.id)) return -1000;
  if (getToolRestrictionReason(tool, profile)) return -500;

  let score = metadata.defaultVisible ? 10 : 0;
  if ((PROFILE_ASSISTANT_SEEDS[profile.role] || []).includes(tool.id)) score += 110;
  if (metadata.intendedRoles?.includes(profile.role)) score += 60;
  if (metadata.specialties?.includes(profile.specialty)) score += 55;
  if (metadata.departments?.includes(profile.department)) score += 25;
  if (metadata.workspaceTags?.includes(profile.workspace)) score += 35;
  if (metadata.workspaceTags?.includes('clinical') && profile.clinicalAccess) score += 8;
  if (metadata.workspaceTags?.includes('operations') && profile.operationsAccess) score += 12;
  if ((profile.preferredTools || []).includes(tool.id)) score += 45;
  if ((profile.pinnedTools || []).includes(tool.id)) score += 80;
  if ((profile.recentTools || []).slice(0, 6).includes(tool.id)) score += 28;
  if (
    metadata.recommendedFor?.includes(profile.role) ||
    metadata.recommendedFor?.includes(profile.specialty)
  )
    score += 20;
  if (metadata.clinicalRiskLevel === 'high' && profile.permissionLevel !== 'admin') score -= 12;
  return score;
}

export function buildProfileToolGraph({ tools = [] as any[], profile }) {
  const segmentedTools = tools.map(enrichToolWithSegmentation);
  const scoredTools = segmentedTools.map((tool) => ({
    ...tool,
    profileScore: scoreToolForProfile(tool, profile),
    restrictionReason: getToolRestrictionReason(tool, profile),
  }));
  const restrictedTools = scoredTools.filter(
    (tool) => tool.restrictionReason && !profile.hiddenTools?.includes(tool.id),
  );
  const visibleTools = scoredTools
    .filter((tool) => !tool.restrictionReason)
    .sort((a, b) => b.profileScore - a.profileScore || a.name.localeCompare(b.name));
  const recommendedTools = visibleTools.filter((tool) => tool.profileScore >= 50).slice(0, 24);
  const pinnedTools = (profile.pinnedTools || [])
    .map((toolId) => visibleTools.find((tool) => tool.id === toolId))
    .filter(Boolean);
  const recentTools = (profile.recentTools || [])
    .map((toolId) => visibleTools.find((tool) => tool.id === toolId))
    .filter(Boolean);
  const favoriteTools = (profile.preferredTools || [])
    .map((toolId) => visibleTools.find((tool) => tool.id === toolId))
    .filter(Boolean);
  const specialtyTools = visibleTools.filter((tool) =>
    tool.specialties?.includes(profile.specialty),
  );
  const workspaceTools = visibleTools.filter((tool) => {
    if (!profile.workspace || profile.workspace === 'all') return true;
    return (
      tool.workspaceTags?.includes(profile.workspace) ||
      normalizeText(tool.category).replace(/\s+/g, '-') === profile.workspace ||
      tool.surface === `${profile.workspace}-page`
    );
  });

  return {
    profile,
    tools: scoredTools,
    visibleTools,
    recommendedTools,
    restrictedTools,
    pinnedTools,
    favoriteTools,
    recentTools,
    specialtyTools,
    workspaceTools,
    counts: {
      visible: visibleTools.length,
      recommended: recommendedTools.length,
      restricted: restrictedTools.length,
      pinned: pinnedTools.length,
      favorites: favoriteTools.length,
      recent: recentTools.length,
      specialtyCoverage: specialtyTools.length,
    },
    specialtyCoverage: {
      specialty: profile.specialty,
      matchingTools: specialtyTools.length,
      totalVisible: visibleTools.length,
    },
  };
}

export function filterToolsForProfileGraph(graph, filter) {
  if (!filter || filter === 'recommended') return graph.recommendedTools;
  if (filter === 'all') return graph.visibleTools;
  if (filter === 'specialty') return graph.specialtyTools;
  if (filter === 'workspace') return graph.workspaceTools;
  if (filter === 'pinned') return graph.pinnedTools;
  if (filter === 'favorites') return graph.favoriteTools;
  if (filter === 'recent') return graph.recentTools;
  if (filter === 'restricted')
    return graph.profile.permissionLevel === 'admin' ? graph.restrictedTools : [];
  return graph.visibleTools;
}

function findToolBySeed(tools, seed) {
  const normalizedSeed = normalizeKey(seed);
  return (
    tools.find((tool) => normalizeKey(tool.id) === normalizedSeed) ||
    tools.find((tool) => normalizeKey(tool.name).includes(normalizedSeed)) ||
    tools.find((tool) => toolText(tool).includes(seed.toLowerCase()))
  );
}

export function getProfileAssistantRecommendations(profile, tools = [] as any[], limit = 4) {
  const segmentedTools = tools.map(enrichToolWithSegmentation);
  const seedIds = PROFILE_ASSISTANT_SEEDS[profile.role] || [];
  const seeded = seedIds.map((seed) => findToolBySeed(segmentedTools, seed)).filter(Boolean);
  const graph = buildProfileToolGraph({ tools: segmentedTools, profile });
  const recommended = unique([
    ...seeded.map((tool) => tool.id),
    ...graph.recommendedTools.map((tool) => tool.id),
  ])
    .map(
      (toolId) =>
        graph.visibleTools.find((tool) => tool.id === toolId) ||
        segmentedTools.find((tool) => tool.id === toolId),
    )
    .filter(Boolean)
    .filter((tool) => isToolAllowedForProfile(tool, profile))
    .slice(0, limit);

  return recommended.map((tool) => ({
    id: `profile-${tool.id}`,
    toolId: tool.id,
    label: tool.name || tool.label || tool.id,
    description: `Recommended for ${profile.role}${profile.specialty ? ` in ${profile.specialty}` : ''}.`,
    reason: `${profile.role} profile match`,
    kind: tool.executorStatus === 'registered' ? 'executor' : 'route',
    path: tool.path || tool.navigationPath,
    prompt: tool.chatSeed,
    source: 'profile-tool-graph',
    defaultRank: Math.max(1, 30 - (tool.profileScore || 0)),
  }));
}
