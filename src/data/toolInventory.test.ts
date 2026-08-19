import { describe, expect, it } from 'vitest';
import {
  getBackendBackedToolInventory,
  getCanonicalToolInventory,
  getAuditToolInventory,
  getCalculatorToolInventory,
  getCatalogToolInventory,
  getFrontendVisibleToolInventory,
  getSidebarToolRegistryProjection,
  getSidebarToolInventory,
  getUserFacingToolRegistryProjection,
  getUserFacingToolInventory,
  resolveToolInventoryRecord,
  TOOL_EXECUTOR_STATUS,
  TOOL_LIFECYCLE_STATES,
  TOOL_LAUNCH_TYPES,
  TOOL_PERMISSION_LOGIC,
  TOOL_SURFACES,
} from './toolInventory';
import {
  ALL_REGISTRY_TOOL_IDS,
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import { PLUGIN_REGISTRY } from './pluginRegistry';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes';

const requiredFields = [
  'id',
  'label',
  'category',
  'tier',
  'status',
  'lifecycleState',
  'sourceKind',
  'launchType',
  'catalogVisible',
  'sidebarVisible',
  'executorStatus',
  'permissionPolicy',
  'testCoverage',
  'riskLevel',
];

describe('canonical tool inventory', () => {
  const records = getCanonicalToolInventory();

  it('has unique canonical ids and required normalized fields', () => {
    expect(records.length).toBeGreaterThan(ALL_REGISTRY_TOOL_IDS.length);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);

    for (const record of records) {
      for (const field of requiredFields) {
        expect(record, `${record.id} missing ${field}`).toHaveProperty(field);
        expect(record[field], `${record.id}.${field} is undefined`).not.toBeUndefined();
      }
      expect(Object.values(TOOL_LIFECYCLE_STATES), record.id).toContain(record.lifecycleState);
      expect(record.label).toBeTruthy();
      expect(record.category).toBeTruthy();
      expect(Array.isArray(record.testCoverage)).toBe(true);
      expect(record.testCoverage.length).toBeGreaterThan(0);
    }
  });

  it('represents every registry/sidebar tool', () => {
    const ids = new Set(records.map((record) => record.id));
    for (const registryId of ALL_REGISTRY_TOOL_IDS) {
      expect(ids.has(registryId), `missing registry tool ${registryId}`).toBe(true);
    }
    expect(getSidebarToolInventory(records).length).toBe(ALL_REGISTRY_TOOL_IDS.length);
  });

  it('projects sidebar-visible tools with legacy card fields for app layout', () => {
    const sidebarTools = getSidebarToolRegistryProjection(records);
    expect(sidebarTools).toHaveLength(ALL_REGISTRY_TOOL_IDS.length);
    expect(sidebarTools.map((tool) => tool.id)).toEqual(ALL_REGISTRY_TOOL_IDS);

    for (const tool of sidebarTools) {
      expect(tool.name, tool.id).toBeTruthy();
      expect(tool.path, tool.id).toBeTruthy();
      expect(tool.category, tool.id).toMatch(
        /Diagnostic|Calculator|Reference|Fleet|IoT|Hospital Operations|AI System|Education & Simulation|Laboratory|Visualization|Other/
      );
      // HEAL-347.11: MEDICAL_THEME values are now theme-aware
      // (`var(--app-token, #hex)`) so inline-styled consumers pick up dark
      // mode; a plain hex is still valid for entries with no matching token.
      expect(tool.color, tool.id).toMatch(/^#|^var\(--app-[\w-]+,\s*#[0-9a-fA-F]{3,8}\)$/);
      expect(Array.isArray(tool.features), tool.id).toBe(true);
      expect(tool.canonicalInventoryId, tool.id).toBe(tool.id);
    }
  });

  it('memoizes stable canonical inventory projections for repeated UI lookups', () => {
    expect(getUserFacingToolInventory()).toBe(getUserFacingToolInventory());
    expect(getSidebarToolRegistryProjection()).toBe(getSidebarToolRegistryProjection());
    expect(getUserFacingToolRegistryProjection()).toBe(getUserFacingToolRegistryProjection());
  });

  it('covers every NLU profile through a canonical record', () => {
    const represented = new Set();
    for (const record of records) {
      if (record.nluToolId) represented.add(record.nluToolId);
      for (const nluId of record.nluProfileIds || []) represented.add(nluId);
      if (record.backendPatternId) represented.add(record.backendPatternId);
    }

    for (const nluId of NLU_PROFILE_TOOL_IDS) {
      expect(represented.has(nluId), `missing NLU profile ${nluId}`).toBe(true);
    }
  });

  it('normalizes backend-backed executors with endpoint, DTOs, client, route, and component', () => {
    const backendBacked = getBackendBackedToolInventory(records);
    expect(backendBacked.map((record) => record.orchestratorToolId).sort()).toEqual(
      [...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort()
    );

    for (const record of backendBacked) {
      expect(record.launchType).toBe(TOOL_LAUNCH_TYPES.BACKEND_BACKED);
      expect(record.executorStatus).toBe(TOOL_EXECUTOR_STATUS.REGISTERED);
      expect(record.route, record.id).toBeTruthy();
      // Backend-executed tools that only have a chat-assisted invocation (no
      // dedicated calculator form/slug) render through the hub/chat surface
      // and have no dedicated per-tool component; tools with a calculatorSlug
      // always resolve a concrete component (see componentFor in toolInventory.tsx).
      if (record.calculatorSlug) {
        expect(record.component, record.id).toBeTruthy();
      }
      expect(record.endpoint, record.id).toBe(`/api/tools/${record.orchestratorToolId}/execute`);
      expect(record.requestDto, record.id).toContain('ExecuteToolDto');
      expect(record.responseDto, record.id).toContain('ToolExecutionResponseDto');
      expect(record.apiClient, record.id).toBe('src/services/clinicalOrchestratorApi.ts');
    }
  });

  it('classifies every frontend-visible tool into a valid launch type with a fallback', () => {
    const allowed = new Set(Object.values(TOOL_LAUNCH_TYPES));
    for (const record of getFrontendVisibleToolInventory(records)) {
      expect(allowed.has(record.launchType), record.id).toBe(true);
      expect(record.fallbackRoute || record.route || record.navigationPath, record.id).toBeTruthy();
    }
    expect(getCatalogToolInventory(records).length).toBeGreaterThan(ALL_REGISTRY_TOOL_IDS.length - 1);
  });

  it('resolves aliases, NLU ids, and registry ids to canonical records', () => {
    for (const [registryId, nluId] of Object.entries(REGISTRY_ID_TO_ORCHESTRATOR_TOOL)) {
      expect(resolveToolInventoryRecord(registryId, records)?.orchestratorToolId).toBe(nluId);
      // Some registry ids are legacy alias keys that map to the same orchestrator
      // tool id as the true canonical registry id (e.g. the literal
      // 'cha2ds2vasc-calculator' key alongside REGISTRY.calcChads2vasc). Resolving
      // by nluId always yields the canonical registry id, not the alias.
      const canonicalRegistryId = ORCHESTRATOR_TO_REGISTRY_ID[nluId] || registryId;
      expect(resolveToolInventoryRecord(nluId, records)?.id).toBe(canonicalRegistryId);
    }

    for (const [nluId, registryId] of Object.entries(ORCHESTRATOR_TO_REGISTRY_ID)) {
      if (nluId === 'dispatch') continue;
      expect(resolveToolInventoryRecord(nluId, records), nluId).toBeTruthy();
      expect([registryId, nluId], nluId).toContain(resolveToolInventoryRecord(nluId, records)?.id);
    }
  });

  it('projects a user-facing inventory without platform or unsupported artifacts', () => {
    const userFacing = getUserFacingToolInventory(records);
    const calculatorRoutes = new Set(CALCULATOR_ROUTE_DEFS.map((def) => def.path));
    const allowedLifecycleStates = new Set(Object.values(TOOL_LIFECYCLE_STATES));
    expect(userFacing.length).toBeGreaterThan(0);
    expect(new Set(userFacing.map((record) => record.id)).size).toBe(userFacing.length);

    for (const record of userFacing) {
      expect(record.userCatalogVisible, record.id).toBe(true);
      expect(record.id, record.id).toBeTruthy();
      expect(record.label, record.id).toBeTruthy();
      expect(record.category, record.id).toBeTruthy();
      expect(record.launchType, record.id).toBeTruthy();
      expect(record.lifecycleState, record.id).toBeTruthy();
      expect(allowedLifecycleStates.has(record.lifecycleState), record.id).toBe(true);
      expect(record.lifecycleLabel, record.id).toBeTruthy();
      expect(record.surface, record.id).toBeTruthy();
      expect(record.route || record.navigationPath || record.chatSeed, record.id).toBeTruthy();
      expect(record.launchType, record.id).not.toBe(TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED);
      if (record.auditRefs.sourceKind === 'platform') {
        expect(record.executorStatus, record.id).toBe(TOOL_EXECUTOR_STATUS.PLATFORM);
        expect(record.auditRefs.sourceKind, record.id).toBe('platform');
      } else {
        expect(record.auditRefs.sourceKind, record.id).not.toBe('platform');
      }

      if (record.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED) {
        expect(record.chatSeed, record.id).toBeTruthy();
        expect(record.navigationPath, record.id).toBe('/assistant');
      }

      if (record.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED) {
        expect(record.endpoint, record.id).toBeTruthy();
        if (record.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED) {
          expect(record.orchestratorToolId, record.id).toBeTruthy();
          expect(record.endpoint, record.id).toBe(`/api/tools/${record.orchestratorToolId}/execute`);
          expect(record.auditRefs.apiClient, record.id).toBe('src/services/clinicalOrchestratorApi.ts');
        } else {
          expect(record.executorStatus, record.id).toBe(TOOL_EXECUTOR_STATUS.PLATFORM);
          expect(record.orchestratorToolId, record.id).toBeFalsy();
          expect(record.auditRefs.apiClient, record.id).toBe('src/services/clinicalIntelligenceApi.ts');
        }
      }

      if (record.hasDedicatedForm) {
        expect(record.calculatorSlug, record.id).toBeTruthy();
        expect(calculatorRoutes.has(record.route), record.id).toBe(true);
        expect(record.component, record.id).toBe('src/pages/tools/Calculators.tsx');
      }

      if (
        [
          TOOL_SURFACES.TOOL_PAGE,
          TOOL_SURFACES.FLEET_PAGE,
          TOOL_SURFACES.IOT_DASHBOARD,
          TOOL_SURFACES.HUB,
        ].includes(record.surface)
      ) {
        expect(record.route, record.id).toBeTruthy();
        expect(record.component, record.id).toBeTruthy();
      }
    }
  });

  it('does not allow user-facing registry projection tools without lifecycle state', () => {
    const tools = getUserFacingToolRegistryProjection(records);
    const allowedLifecycleStates = new Set(Object.values(TOOL_LIFECYCLE_STATES));

    expect(tools.length).toBeGreaterThan(100);
    for (const tool of tools) {
      expect(tool.lifecycleState, tool.id).toBeTruthy();
      expect(allowedLifecycleStates.has(tool.lifecycleState), tool.id).toBe(true);
      expect(tool.lifecycleLabel, tool.id).toBeTruthy();
    }
  });

  it('projects calculator tools once, including forms and chat-assisted records', () => {
    const calculatorTools = getCalculatorToolInventory(records);
    expect(calculatorTools.length).toBeGreaterThan(0);
    expect(new Set(calculatorTools.map((record) => record.id)).size).toBe(calculatorTools.length);
    expect(calculatorTools.some((record) => record.hasDedicatedForm && record.calculatorSlug === 'qsofa')).toBe(true);
    expect(calculatorTools.some((record) => record.surface === TOOL_SURFACES.CHAT_ASSISTED)).toBe(true);
    expect(calculatorTools.some((record) => record.id === 'dispatch-ai')).toBe(false);

    const chatKeys = calculatorTools
      .filter((record) => record.surface === TOOL_SURFACES.CHAT_ASSISTED)
      .map((record) => record.nluToolId || record.id);
    expect(new Set(chatKeys).size).toBe(chatKeys.length);
  });

  it('samples the technical-medical execution bridge across backend, local, chat, and platform tools', () => {
    expect(resolveToolInventoryRecord('drug-check', records)).toMatchObject({
      id: 'drug-check',
      launchType: TOOL_LAUNCH_TYPES.BACKEND_BACKED,
      executorStatus: TOOL_EXECUTOR_STATUS.REGISTERED,
      orchestratorToolId: 'drug-interactions',
      endpoint: '/api/tools/drug-interactions/execute',
    });

    expect(resolveToolInventoryRecord('qsofa', records)).toMatchObject({
      id: 'qsofa',
      calculatorSlug: 'qsofa',
      component: 'src/pages/tools/Calculators.tsx',
    });
    expect(getUserFacingToolInventory(records).find((record) => record.id === 'qsofa')).toMatchObject({
      id: 'qsofa',
      hasDedicatedForm: true,
    });

    expect(resolveToolInventoryRecord('nexus-cspine', records)).toMatchObject({
      id: 'nexus-cspine',
      launchType: TOOL_LAUNCH_TYPES.BACKEND_BACKED,
    });
    expect(resolveToolInventoryRecord('nexus-cspine', records)?.chatSeed).toMatch(/decision support/i);
    expect(getUserFacingToolInventory(records).find((record) => record.id === 'nexus-cspine')).toMatchObject({
      id: 'nexus-cspine',
      surface: TOOL_SURFACES.CALCULATOR_FORM,
    });

    expect(resolveToolInventoryRecord('ambient-scribe', records)).toMatchObject({
      id: 'ambient-scribe',
      executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
      endpoint: '/api/clinical-intelligence/ambient-scribe/generate',
    });
  });

  it('integrates plugin registrations into canonical and user-facing inventory', () => {
    const pluginIds = PLUGIN_REGISTRY.map((plugin) => plugin.id);
    const canonicalById = new Map(records.map((record) => [record.id, record]));
    const userFacingById = new Map(getUserFacingToolInventory(records).map((record) => [record.id, record]));

    for (const plugin of PLUGIN_REGISTRY) {
      const canonical = canonicalById.get(plugin.id);
      expect(canonical, plugin.id).toBeTruthy();
      expect(canonical).toMatchObject({
        sourceKind: 'plugin',
        status: plugin.lifecycle.status,
        permissionPolicy: plugin.permissions,
      });
      expect(canonical.plugin).toMatchObject({
        id: plugin.id,
        type: plugin.type,
        owner: plugin.owner,
        version: plugin.version,
      });
      expect(userFacingById.get(plugin.id), plugin.id).toBeTruthy();
    }

    // Alias resolution falls back to a plugin's own name when the id doesn't
    // match directly (HEAL-080 moved this plugin to a real dedicated route,
    // so its 'future-tool' placeholder tag no longer applies).
    expect(resolveToolInventoryRecord('Fluid Resuscitation Calculator Plugin', records)?.id).toBe(
      'plugin-fluid-resuscitation-calculator'
    );
    expect(pluginIds).toContain('plugin-guideline-copilot-extension');
  });

  it('projects audit records separately from the user-facing catalog', () => {
    const audit = getAuditToolInventory(records);
    expect(audit.length).toBe(records.length);
    expect(audit.some((record) => record.kind === 'platform-api')).toBe(true);
    expect(audit.some((record) => record.launchable === false)).toBe(true);
  });

  it('registers ambient-scribe as a Tier C clinical intelligence workflow', () => {
    const record = resolveToolInventoryRecord('ambient-scribe', records);

    expect(record).toMatchObject({
      id: 'ambient-scribe',
      tier: 'C',
      launchType: TOOL_LAUNCH_TYPES.CLINICAL_PAGE,
      endpoint: '/api/clinical-intelligence/ambient-scribe/generate',
      component: 'src/pages/tools/AmbientScribe.tsx',
      executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
      permissionPolicy: {
        permissions: ['READ_PHI', 'USE_AI_CHAT'],
        logic: TOOL_PERMISSION_LOGIC.ALL,
        backendController: 'ClinicalIntelligenceController',
      },
      riskLevel: 'high',
    });
  });

  it('registers calculator-recommender-ai as a launchable clinical page with NLU coverage', () => {
    const record = resolveToolInventoryRecord('calculator-recommender-ai', records);

    expect(record).toMatchObject({
      id: 'calculator-recommender-ai',
      route: '/tools/calculator-recommender',
      component: 'src/pages/tools/CalculatorRecommender.tsx',
      nluToolId: 'calculator-recommender-ai',
      launchType: TOOL_LAUNCH_TYPES.CLINICAL_PAGE,
      executorStatus: TOOL_EXECUTOR_STATUS.UNSUPPORTED,
    });
  });

  it('registers guideline-rag as a Tier C backend clinical intelligence workflow', () => {
    const record = resolveToolInventoryRecord('guideline-rag', records);

    expect(record).toMatchObject({
      id: 'guideline-rag',
      tier: 'C',
      launchType: TOOL_LAUNCH_TYPES.CLINICAL_PAGE,
      endpoint: '/api/clinical-intelligence/guideline-rag/query',
      component: 'src/pages/tools/GuidelineRag.tsx',
      executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
      permissionPolicy: {
        permissions: ['USE_AI_CHAT'],
        logic: TOOL_PERMISSION_LOGIC.ALL,
        backendController: 'ClinicalIntelligenceController',
      },
      riskLevel: 'high',
    });
  });

  it('registers differential-ai as a Tier C backend clinical intelligence workflow with NLU coverage', () => {
    const record = resolveToolInventoryRecord('differential-ai', records);

    expect(record).toMatchObject({
      id: 'differential-ai',
      tier: 'C',
      nluToolId: 'differential-ai',
      launchType: TOOL_LAUNCH_TYPES.CLINICAL_PAGE,
      endpoint: '/api/clinical-intelligence/differential-ai/generate',
      component: 'src/pages/tools/DifferentialAi.tsx',
      executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
      riskLevel: 'high',
    });
  });

  it('registers timeline-ai as a Tier C backend clinical intelligence workflow', () => {
    const record = resolveToolInventoryRecord('timeline-ai', records);

    expect(record).toMatchObject({
      id: 'timeline-ai',
      tier: 'C',
      launchType: TOOL_LAUNCH_TYPES.CLINICAL_PAGE,
      endpoint: '/api/clinical-intelligence/timeline-ai/generate',
      component: 'src/pages/tools/TimelineAi.tsx',
      executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
      riskLevel: 'high',
    });
  });

  it('registers patient-summary-ai as a Tier C backend clinical intelligence workflow', () => {
    const record = resolveToolInventoryRecord('patient-summary-ai', records);

    expect(record).toMatchObject({
      id: 'patient-summary-ai',
      tier: 'C',
      launchType: TOOL_LAUNCH_TYPES.CLINICAL_PAGE,
      endpoint: '/api/clinical-intelligence/patient-summary-ai/generate',
      component: 'src/pages/tools/PatientSummaryAi.tsx',
      executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
      riskLevel: 'high',
    });
  });

  it('registers order-set-ai as a Tier C backend clinical intelligence workflow', () => {
    const record = resolveToolInventoryRecord('order-set-ai', records);

    expect(record).toMatchObject({
      id: 'order-set-ai',
      tier: 'C',
      launchType: TOOL_LAUNCH_TYPES.CLINICAL_PAGE,
      endpoint: '/api/clinical-intelligence/order-set-ai/generate',
      component: 'src/pages/tools/OrderSetAi.tsx',
      executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
      riskLevel: 'high',
    });
  });

  it('registers ai-explainability as a Tier C backend clinical intelligence workflow', () => {
    const record = resolveToolInventoryRecord('ai-explainability', records);

    expect(record).toMatchObject({
      id: 'ai-explainability',
      tier: 'C',
      launchType: TOOL_LAUNCH_TYPES.CLINICAL_PAGE,
      endpoint: '/api/clinical-intelligence/ai-explainability/trace',
      component: 'src/pages/tools/AiExplainability.tsx',
      executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
      riskLevel: 'high',
    });
  });

  it('registers clinical-audit as a Tier C backend clinical intelligence workflow', () => {
    const record = resolveToolInventoryRecord('clinical-audit', records);

    expect(record).toMatchObject({
      id: 'clinical-audit',
      tier: 'C',
      launchType: TOOL_LAUNCH_TYPES.CLINICAL_PAGE,
      endpoint: '/api/clinical-intelligence/clinical-audit/execution-logs',
      component: 'src/pages/tools/ClinicalAudit.tsx',
      executorStatus: TOOL_EXECUTOR_STATUS.PLATFORM,
      permissionPolicy: {
        permissions: ['VIEW_AUDIT_LOGS'],
        logic: TOOL_PERMISSION_LOGIC.ALL,
        backendController: 'ClinicalIntelligenceController',
      },
      riskLevel: 'high',
    });
  });

  it('captures frontend preflight permissions for every clinical-intelligence backend workflow', () => {
    const expected = {
      'ambient-scribe': ['READ_PHI', 'USE_AI_CHAT'],
      'guideline-rag': ['USE_AI_CHAT'],
      'differential-ai': ['READ_PHI', 'USE_AI_CHAT'],
      'timeline-ai': ['READ_PHI', 'USE_AI_CHAT'],
      'patient-summary-ai': ['READ_PHI', 'USE_AI_CHAT'],
      'order-set-ai': ['READ_PHI', 'USE_AI_CHAT'],
      'ai-explainability': ['READ_PHI', 'USE_AI_CHAT'],
      'clinical-audit': ['VIEW_AUDIT_LOGS'],
    };

    for (const [id, permissions] of Object.entries(expected)) {
      const record = resolveToolInventoryRecord(id, records);

      expect(record?.executorStatus, id).toBe(TOOL_EXECUTOR_STATUS.PLATFORM);
      expect(record?.permissionPolicy, id).toMatchObject({
        permissions,
        logic: TOOL_PERMISSION_LOGIC.ALL,
        backendController: 'ClinicalIntelligenceController',
      });
    }
  });
});
