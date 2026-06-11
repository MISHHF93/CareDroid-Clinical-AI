export const PLUGIN_TYPES = Object.freeze({
  CALCULATOR: 'calculator',
  PROTOCOL: 'protocol',
  SIMULATION: 'simulation',
  DASHBOARD: 'dashboard',
  WORKFLOW: 'workflow',
  AI_EXTENSION: 'ai-extension',
});

export const PLUGIN_LIFECYCLE_STATUS = Object.freeze({
  DRAFT: 'draft',
  REGISTERED: 'registered',
  BETA: 'beta',
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  DISABLED: 'disabled',
});

export const PLUGIN_PERMISSION_LOGIC = Object.freeze({
  ALL: 'all',
  ANY: 'any',
});

export const PLUGIN_ALLOWED_PERMISSIONS = Object.freeze([
  'READ_PHI',
  'WRITE_PHI',
  'USE_CALCULATORS',
  'USE_PROTOCOLS',
  'USE_AI_CHAT',
  'VIEW_ANALYTICS',
  'CONFIGURE_SYSTEM',
  'VIEW_OPERATIONS',
  'VIEW_OBSERVABILITY',
  'MANAGE_INCIDENTS',
]);

const INVENTORY_LIFECYCLE_BY_PLUGIN_STATUS = Object.freeze({
  [PLUGIN_LIFECYCLE_STATUS.DRAFT]: 'draft',
  [PLUGIN_LIFECYCLE_STATUS.REGISTERED]: 'beta',
  [PLUGIN_LIFECYCLE_STATUS.BETA]: 'beta',
  [PLUGIN_LIFECYCLE_STATUS.ACTIVE]: 'active',
  [PLUGIN_LIFECYCLE_STATUS.DEPRECATED]: 'deprecated',
  [PLUGIN_LIFECYCLE_STATUS.DISABLED]: 'archived',
});

const INVENTORY_CATEGORY_BY_PLUGIN_TYPE = Object.freeze({
  [PLUGIN_TYPES.CALCULATOR]: 'calculator',
  [PLUGIN_TYPES.PROTOCOL]: 'protocol',
  [PLUGIN_TYPES.SIMULATION]: 'simulation',
  [PLUGIN_TYPES.DASHBOARD]: 'hospital-operations',
  [PLUGIN_TYPES.WORKFLOW]: 'reference',
  [PLUGIN_TYPES.AI_EXTENSION]: 'clinical ai',
});

const INVENTORY_LAUNCH_TYPE_BY_PLUGIN_TYPE = Object.freeze({
  [PLUGIN_TYPES.CALCULATOR]: 'local-only',
  [PLUGIN_TYPES.PROTOCOL]: 'clinical-page',
  [PLUGIN_TYPES.SIMULATION]: 'clinical-page',
  [PLUGIN_TYPES.DASHBOARD]: 'clinical-page',
  [PLUGIN_TYPES.WORKFLOW]: 'chat-assisted',
  [PLUGIN_TYPES.AI_EXTENSION]: 'chat-assisted',
});

export const PLUGIN_REGISTRY = Object.freeze([
  {
    id: 'plugin-fluid-resuscitation-calculator',
    type: PLUGIN_TYPES.CALCULATOR,
    name: 'Fluid Resuscitation Calculator Plugin',
    owner: 'clinical-platform',
    version: '0.1.0',
    lifecycle: {
      status: PLUGIN_LIFECYCLE_STATUS.REGISTERED,
      since: '2026-05-30',
    },
    permissions: {
      permissions: ['USE_CALCULATORS'],
      logic: PLUGIN_PERMISSION_LOGIC.ALL,
    },
    inventory: {
      route: '/tools/catalog',
      component: 'src/pages/tools/ClinicalToolCatalog.jsx',
      description:
        'Future calculator plugin registration slot for fluid resuscitation decision-support tools.',
      catalogVisible: true,
      sidebarVisible: false,
      tags: ['calculator', 'plugin', 'future-tool'],
      testCoverage: ['pluginRegistry.test.js'],
      riskLevel: 'medium',
    },
  },
  {
    id: 'plugin-anticoagulation-protocol',
    type: PLUGIN_TYPES.PROTOCOL,
    name: 'Anticoagulation Protocol Plugin',
    owner: 'clinical-guidelines',
    version: '0.2.0',
    lifecycle: {
      status: PLUGIN_LIFECYCLE_STATUS.BETA,
      since: '2026-05-30',
    },
    permissions: {
      permissions: ['USE_PROTOCOLS'],
      logic: PLUGIN_PERMISSION_LOGIC.ALL,
    },
    inventory: {
      route: '/protocols',
      component: 'src/pages/tools/Protocols.jsx',
      description:
        'Protocol plugin slot for anticoagulation pathways, version history, and linked calculators.',
      catalogVisible: true,
      sidebarVisible: false,
      tags: ['protocol', 'guideline', 'plugin'],
      testCoverage: ['pluginRegistry.test.js'],
      riskLevel: 'medium',
    },
  },
  {
    id: 'plugin-pediatric-code-simulation',
    type: PLUGIN_TYPES.SIMULATION,
    name: 'Pediatric Code Simulation Plugin',
    owner: 'simulation-program',
    version: '0.1.0',
    lifecycle: {
      status: PLUGIN_LIFECYCLE_STATUS.BETA,
      since: '2026-05-30',
    },
    permissions: {
      permissions: ['USE_AI_CHAT'],
      logic: PLUGIN_PERMISSION_LOGIC.ALL,
    },
    inventory: {
      route: '/simulation',
      component: 'src/pages/MedicalSimulationSuite.jsx',
      description:
        'Simulation plugin slot for timed pediatric code scenarios, scoring rubrics, and debriefs.',
      catalogVisible: true,
      sidebarVisible: false,
      tags: ['simulation', 'education', 'plugin'],
      testCoverage: ['pluginRegistry.test.js'],
      riskLevel: 'low',
    },
  },
  {
    id: 'plugin-capacity-command-dashboard',
    type: PLUGIN_TYPES.DASHBOARD,
    name: 'Capacity Command Dashboard Plugin',
    owner: 'operations-platform',
    version: '0.1.0',
    lifecycle: {
      status: PLUGIN_LIFECYCLE_STATUS.REGISTERED,
      since: '2026-05-30',
    },
    permissions: {
      permissions: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'],
      logic: PLUGIN_PERMISSION_LOGIC.ANY,
    },
    inventory: {
      route: '/operations',
      component: 'src/pages/Operations.jsx',
      description:
        'Dashboard plugin slot for capacity, bed, device, and operational command-center panels.',
      catalogVisible: true,
      sidebarVisible: false,
      tags: ['dashboard', 'operations', 'plugin'],
      testCoverage: ['pluginRegistry.test.js'],
      riskLevel: 'medium',
    },
  },
  {
    id: 'plugin-discharge-workflow',
    type: PLUGIN_TYPES.WORKFLOW,
    name: 'Discharge Workflow Plugin',
    owner: 'care-transitions',
    version: '0.1.0',
    lifecycle: {
      status: PLUGIN_LIFECYCLE_STATUS.DRAFT,
      since: '2026-05-30',
    },
    permissions: {
      permissions: ['USE_AI_CHAT'],
      logic: PLUGIN_PERMISSION_LOGIC.ALL,
    },
    ai: {
      chatSeed:
        'Help me prepare a discharge workflow brief. Keep output clinician-reviewed and identify missing source data.',
    },
    inventory: {
      route: '/assistant',
      component: 'src/components/ChatInterface.jsx',
      description:
        'Workflow plugin slot for discharge checklist orchestration, documentation handoff, and follow-up planning.',
      catalogVisible: true,
      sidebarVisible: false,
      tags: ['workflow', 'assistant', 'plugin'],
      testCoverage: ['pluginRegistry.test.js'],
      riskLevel: 'medium',
    },
  },
  {
    id: 'plugin-guideline-copilot-extension',
    type: PLUGIN_TYPES.AI_EXTENSION,
    name: 'Guideline Copilot AI Extension',
    owner: 'ai-platform',
    version: '0.1.0',
    lifecycle: {
      status: PLUGIN_LIFECYCLE_STATUS.ACTIVE,
      since: '2026-05-30',
    },
    permissions: {
      permissions: ['USE_AI_CHAT'],
      logic: PLUGIN_PERMISSION_LOGIC.ALL,
    },
    ai: {
      chatSeed:
        'Use the guideline copilot extension to compare evidence snippets with cited uncertainty and local-policy verification.',
    },
    inventory: {
      route: '/assistant',
      component: 'src/components/ChatInterface.jsx',
      description:
        'AI extension plugin for evidence-aware guideline comparison and cited assistant responses.',
      catalogVisible: true,
      sidebarVisible: false,
      tags: ['ai-extension', 'guideline', 'plugin'],
      testCoverage: ['pluginRegistry.test.js'],
      riskLevel: 'medium',
    },
  },
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];
}

export function validatePluginRegistration(plugin, existingPlugins = PLUGIN_REGISTRY) {
  const errors = [];
  const warnings = [];

  if (!plugin || typeof plugin !== 'object') {
    return { valid: false, errors: ['Plugin registration must be an object.'], warnings };
  }

  if (!/^[a-z][a-z0-9-]+$/.test(plugin.id || '')) {
    errors.push('Plugin id must be kebab-case and start with a letter.');
  }

  if (!Object.values(PLUGIN_TYPES).includes(plugin.type)) {
    errors.push(`Plugin type must be one of: ${Object.values(PLUGIN_TYPES).join(', ')}.`);
  }

  if (!isNonEmptyString(plugin.name)) errors.push('Plugin name is required.');
  if (!isNonEmptyString(plugin.owner)) errors.push('Plugin owner is required.');
  if (!isNonEmptyString(plugin.version)) errors.push('Plugin version is required.');

  const duplicate = existingPlugins.some((existing) => existing !== plugin && existing.id === plugin.id);
  if (duplicate) errors.push(`Plugin id "${plugin.id}" is already registered.`);

  const status = plugin.lifecycle?.status;
  if (!Object.values(PLUGIN_LIFECYCLE_STATUS).includes(status)) {
    errors.push(`Plugin lifecycle.status must be one of: ${Object.values(PLUGIN_LIFECYCLE_STATUS).join(', ')}.`);
  }

  const permissionLogic = plugin.permissions?.logic || PLUGIN_PERMISSION_LOGIC.ALL;
  if (!Object.values(PLUGIN_PERMISSION_LOGIC).includes(permissionLogic)) {
    errors.push('Plugin permissions.logic must be "all" or "any".');
  }

  const permissions = plugin.permissions?.permissions || [];
  if (!Array.isArray(permissions)) {
    errors.push('Plugin permissions.permissions must be an array.');
  } else {
    for (const permission of permissions) {
      if (!PLUGIN_ALLOWED_PERMISSIONS.includes(permission)) {
        errors.push(`Unsupported plugin permission "${permission}".`);
      }
    }
  }

  if (!plugin.inventory || typeof plugin.inventory !== 'object') {
    errors.push('Plugin inventory metadata is required.');
  } else {
    if (!isNonEmptyString(plugin.inventory.description)) {
      errors.push('Plugin inventory.description is required.');
    }
    if (plugin.inventory.catalogVisible !== false && !plugin.inventory.route && !plugin.ai?.chatSeed) {
      errors.push('Catalog-visible plugins need an inventory.route or ai.chatSeed.');
    }
    if (plugin.inventory.sidebarVisible) {
      warnings.push('Plugin sidebar visibility is allowed, but prefer catalog-only until the plugin route is promoted.');
    }
  }

  if (
    [PLUGIN_TYPES.WORKFLOW, PLUGIN_TYPES.AI_EXTENSION].includes(plugin.type) &&
    !plugin.ai?.chatSeed &&
    !plugin.inventory?.route
  ) {
    errors.push('Workflow and AI extension plugins need ai.chatSeed or an inventory.route.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validatePluginRegistry(plugins = PLUGIN_REGISTRY) {
  const seen = new Set();
  const results = plugins.map((plugin) => {
    const validation = validatePluginRegistration(
      plugin,
      plugins.filter((candidate) => candidate !== plugin)
    );
    if (seen.has(plugin.id)) {
      validation.errors.push(`Plugin id "${plugin.id}" is duplicated in the registry.`);
      validation.valid = false;
    }
    seen.add(plugin.id);
    return { pluginId: plugin.id, ...validation };
  });

  return {
    valid: results.every((result) => result.valid),
    results,
    errors: results.flatMap((result) => result.errors.map((error) => `${result.pluginId}: ${error}`)),
    warnings: results.flatMap((result) => result.warnings.map((warning) => `${result.pluginId}: ${warning}`)),
  };
}

export function normalizePluginRegistration(plugin) {
  const validation = validatePluginRegistration(plugin, []);
  if (!validation.valid) {
    throw new Error(`Invalid plugin registration: ${validation.errors.join(' ')}`);
  }

  return Object.freeze({
    ...plugin,
    lifecycle: Object.freeze({
      status: plugin.lifecycle.status,
      since: plugin.lifecycle.since || null,
    }),
    permissions: Object.freeze({
      permissions: Object.freeze([...(plugin.permissions?.permissions || [])]),
      logic: plugin.permissions?.logic || PLUGIN_PERMISSION_LOGIC.ALL,
    }),
    inventory: Object.freeze({
      ...plugin.inventory,
      catalogVisible: plugin.inventory.catalogVisible !== false,
      sidebarVisible: Boolean(plugin.inventory.sidebarVisible),
      tags: Object.freeze([...(plugin.inventory.tags || [])]),
      testCoverage: Object.freeze([...(plugin.inventory.testCoverage || [])]),
    }),
  });
}

export function buildPluginInventoryRecords(plugins = PLUGIN_REGISTRY) {
  return plugins.map((plugin) => {
    const launchType = INVENTORY_LAUNCH_TYPE_BY_PLUGIN_TYPE[plugin.type] || 'unsupported-planned';
    const route = plugin.inventory.route || (plugin.ai?.chatSeed ? '/assistant' : '/tools/catalog');
    const isChatAssisted = launchType === 'chat-assisted';
    const permissionPolicy = {
      permissions: [...(plugin.permissions?.permissions || [])],
      logic: plugin.permissions?.logic || PLUGIN_PERMISSION_LOGIC.ALL,
    };

    return {
      id: plugin.id,
      label: plugin.name,
      category: plugin.inventory.category || INVENTORY_CATEGORY_BY_PLUGIN_TYPE[plugin.type] || 'plugin',
      tier: 'plugin',
      status: plugin.lifecycle.status,
      lifecycleState:
        INVENTORY_LIFECYCLE_BY_PLUGIN_STATUS[plugin.lifecycle.status] || 'experimental',
      sourceKind: 'plugin',
      route,
      component: plugin.inventory.component || null,
      launchType,
      catalogVisible: plugin.inventory.catalogVisible !== false,
      sidebarVisible: Boolean(plugin.inventory.sidebarVisible),
      calculatorSlug: null,
      fallbackRoute: isChatAssisted ? '/assistant' : route,
      navigationPath: isChatAssisted ? '/assistant' : route,
      nluToolId: null,
      nluProfileIds: [],
      aliases: unique([plugin.id, plugin.name, ...(plugin.aliases || []), ...(plugin.inventory.tags || [])]),
      backendKeywords: [],
      backendPatternId: null,
      requiredParameters: plugin.requiredParameters || [],
      optionalParameters: plugin.optionalParameters || [],
      orchestratorToolId: null,
      endpoint: isChatAssisted ? '/api/chat/message' : null,
      requestDto: plugin.requestDto || null,
      responseDto: plugin.responseDto || null,
      executorStatus: 'none',
      apiClient: isChatAssisted ? 'src/services/clinicalChatService.js' : null,
      permissionPolicy,
      safetyCopy: plugin.inventory.description,
      chatSeed: plugin.ai?.chatSeed || null,
      testCoverage: unique(['pluginRegistry.test.js', ...(plugin.inventory.testCoverage || [])]),
      riskLevel: plugin.inventory.riskLevel || (permissionPolicy.permissions.length ? 'medium' : 'low'),
      notes: `Plugin type: ${plugin.type}; owner: ${plugin.owner}; version: ${plugin.version}`,
      plugin: {
        id: plugin.id,
        type: plugin.type,
        owner: plugin.owner,
        version: plugin.version,
        lifecycleStatus: plugin.lifecycle.status,
      },
    };
  });
}
