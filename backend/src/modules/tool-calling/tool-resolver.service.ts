import { Injectable } from '@nestjs/common';
import {
  EXECUTOR_REQUEST_CONTRACTS,
  REGISTERED_EXECUTOR_TOOL_IDS,
  REGISTRY_ID_TO_EXECUTOR_TOOL_ID,
  resolveExecutorToolId,
} from '../medical-control-plane/tool-orchestrator/tool-orchestrator.registry';
import {
  getToolPattern,
  matchToolPatterns,
} from '../medical-control-plane/intent-classifier/patterns/tool.patterns';
import {
  CatalogLaunch,
  ToolDefinition,
  ToolParameterSpec,
  ToolResolution,
} from './tool-calling.types';

const EMPTY_LAUNCH: CatalogLaunch = Object.freeze({
  path: null,
  registryId: null,
  chatSeed: null,
  orchestratorTool: null,
  openLabel: 'Try in chat',
});

const UNKNOWN_TOOL_LAUNCH: CatalogLaunch = Object.freeze({
  path: '/assistant',
  registryId: null,
  chatSeed:
    'Help me find the right CareDroid tool for this request. Ask for missing details before taking action. Clinical decision support only.',
  orchestratorTool: null,
  openLabel: 'Try in chat',
});

const NUMERIC_PARAMETERS = new Set([
  'age',
  'bilirubin',
  'creatinine',
  'dobutamine',
  'dopamine',
  'epinephrine',
  'fio2',
  'gcs',
  'map',
  'norepinephrine',
  'pao2',
  'patientAge',
  'platelets',
  'urineOutput',
]);

const ARRAY_PARAMETERS = new Set(['labValues', 'medications']);
const BOOLEAN_PARAMETERS = new Set(['mechanicalVentilation']);

function parameterType(name: string): ToolParameterSpec['type'] {
  if (ARRAY_PARAMETERS.has(name)) return 'array';
  if (BOOLEAN_PARAMETERS.has(name)) return 'boolean';
  if (NUMERIC_PARAMETERS.has(name)) return 'number';
  return 'string';
}

function titleFromId(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function makeParameter(name: string, required: boolean): ToolParameterSpec {
  return {
    name,
    required,
    type: parameterType(name),
    description: titleFromId(name),
  };
}

function guardedSeed(toolName: string): string {
  return `Help me use ${toolName}. Ask for missing required details before running a tool. Clinical decision support only.`;
}

function registryIdForExecutor(executorId: string): string | null {
  const pair = Object.entries(REGISTRY_ID_TO_EXECUTOR_TOOL_ID).find(([, id]) => id === executorId);
  return pair?.[0] || null;
}

@Injectable()
export class ToolResolverService {
  private readonly catalog = new Map<string, ToolDefinition>();
  private readonly aliases = new Map<string, string>();

  constructor() {
    for (const definition of this.buildCatalog()) {
      this.catalog.set(definition.id, definition);
      for (const alias of definition.aliases || []) {
        this.aliases.set(alias, definition.id);
      }
    }
  }

  resolve(input: {
    prompt?: string;
    requestedToolId?: string;
    classifiedToolId?: string;
    confidence?: number;
  }): ToolResolution {
    const requestedToolId = input.requestedToolId || input.classifiedToolId || null;
    const explicitId = this.normalizeToolId(requestedToolId);
    const promptMatch = explicitId ? null : this.inferToolIdFromPrompt(input.prompt || '');
    const candidateId = explicitId || promptMatch?.toolId || null;

    if (!candidateId) {
      return {
        requestedToolId,
        resolvedToolId: null,
        definition: null,
        launch: { ...EMPTY_LAUNCH },
        confidence: input.confidence ?? 0,
        reason: 'No tool intent was detected.',
      };
    }

    const resolvedId = this.aliases.get(candidateId) || candidateId;
    const definition = this.catalog.get(resolvedId);

    if (!definition) {
      return {
        requestedToolId: requestedToolId || candidateId,
        resolvedToolId: null,
        definition: null,
        launch: this.resolveCatalogLaunch(candidateId),
        confidence: input.confidence ?? promptMatch?.confidence ?? 0.45,
        reason: `Tool "${candidateId}" is not registered for backend tool calling.`,
      };
    }

    return {
      requestedToolId: requestedToolId || candidateId,
      resolvedToolId: definition.id,
      definition,
      launch: definition.launch,
      confidence: input.confidence ?? promptMatch?.confidence ?? 0.8,
      reason: `Resolved ${candidateId} to ${definition.id}.`,
    };
  }

  resolveCatalogLaunch(toolId: string | null | undefined): CatalogLaunch {
    const id = this.normalizeToolId(toolId);
    if (!id) return { ...EMPTY_LAUNCH };

    const resolvedId = this.aliases.get(id) || id;
    const definition = this.catalog.get(resolvedId);
    if (definition) return { ...definition.launch };

    const executor = resolveExecutorToolId(id);
    if (executor) {
      const registryId = registryIdForExecutor(executor.resolvedId);
      return {
        path: '/assistant',
        registryId,
        chatSeed: guardedSeed(titleFromId(executor.resolvedId)),
        orchestratorTool: executor.resolvedId,
        openLabel: 'Run in chat',
      };
    }

    if (!/^[a-z][a-z0-9-]*$/i.test(id)) {
      return { ...EMPTY_LAUNCH };
    }

    return {
      ...UNKNOWN_TOOL_LAUNCH,
      chatSeed: `The tool "${id}" is not recognized for backend execution. Help me choose a supported CareDroid calculator, map, fleet, IoT, or backend executor. Clinical decision support only.`,
    };
  }

  getCatalog(): ToolDefinition[] {
    return [...this.catalog.values()];
  }

  private normalizeToolId(toolId: string | null | undefined): string | null {
    if (!toolId || typeof toolId !== 'string') return null;
    const trimmed = toolId.trim();
    return trimmed || null;
  }

  private inferToolIdFromPrompt(prompt: string): { toolId: string; confidence: number } | null {
    const text = prompt.toLowerCase();
    if (!text.trim()) return null;

    const matches = matchToolPatterns(prompt);
    if (matches.length > 0) {
      return { toolId: matches[0].toolId, confidence: matches[0].confidence };
    }

    if (text.includes('route') || text.includes('vehicle') || text.includes('fleet')) {
      return { toolId: 'fleet-live-map', confidence: 0.7 };
    }
    if (text.includes('iot') || text.includes('telemetry') || text.includes('device')) {
      return { toolId: 'medical-iot-dashboard', confidence: 0.7 };
    }
    if (text.includes('map') || text.includes('floor') || text.includes('bed location')) {
      return { toolId: 'hospital-map', confidence: 0.68 };
    }
    if (text.includes('backend executor') || text.includes('platform capability')) {
      return { toolId: 'clinical-reasoning-engine', confidence: 0.6 };
    }

    return null;
  }

  private buildCatalog(): ToolDefinition[] {
    return [
      ...REGISTERED_EXECUTOR_TOOL_IDS.map((id) => this.buildExecutorDefinition(id)),
      ...this.buildLiveTrackingDefinitions(),
      ...this.buildPlatformDefinitions(),
    ];
  }

  private buildExecutorDefinition(
    id: (typeof REGISTERED_EXECUTOR_TOOL_IDS)[number],
  ): ToolDefinition {
    const pattern = getToolPattern(id);
    const contract = EXECUTOR_REQUEST_CONTRACTS[id];
    const registryId = registryIdForExecutor(id);
    const requiredParameters = contract.requiredParameters.map((name) => makeParameter(name, true));
    const optionalParameters = contract.optionalParameters.map((name) =>
      makeParameter(name, false),
    );

    return {
      id,
      name: pattern?.toolName || titleFromId(id),
      description:
        pattern?.description || `Backend executor for ${pattern?.toolName || titleFromId(id)}.`,
      category: id === 'sofa-calculator' ? 'calculator' : 'backend-executor',
      executionKind: 'orchestrator',
      executorToolId: id,
      aliases: [
        registryId,
        ...Object.entries(REGISTRY_ID_TO_EXECUTOR_TOOL_ID)
          .filter(([, executor]) => executor === id)
          .map(([alias]) => alias),
      ].filter(Boolean) as string[],
      launch: {
        path: '/assistant',
        registryId,
        chatSeed: guardedSeed(pattern?.toolName || titleFromId(id)),
        orchestratorTool: id,
        openLabel: 'Run in chat',
      },
      requiredParameters,
      optionalParameters,
    };
  }

  private buildLiveTrackingDefinitions(): ToolDefinition[] {
    return [
      {
        id: 'hospital-map',
        name: 'Hospital Map',
        description: 'Demo-backed hospital floor, room, bed, and device map.',
        category: 'map',
        executionKind: 'live-tracking',
        aliases: ['facility-map', 'hospital-live-map'],
        launch: {
          path: '/hospital-map',
          registryId: 'hospital-map',
          chatSeed: guardedSeed('Hospital Map'),
          orchestratorTool: null,
          openLabel: 'Open map',
        },
        requiredParameters: [],
        optionalParameters: [makeParameter('floorId', false), makeParameter('unitId', false)],
      },
      {
        id: 'fleet-live-map',
        name: 'Fleet Live Map',
        description: 'Demo-backed fleet vehicle and route status.',
        category: 'fleet',
        executionKind: 'live-tracking',
        aliases: ['fleet-command', 'route-optimizer', 'predictive-maintenance'],
        launch: {
          path: '/fleet/map',
          registryId: 'fleet-live-map',
          chatSeed: guardedSeed('Fleet Live Map'),
          orchestratorTool: null,
          openLabel: 'Open fleet map',
        },
        requiredParameters: [],
        optionalParameters: [makeParameter('vehicleId', false), makeParameter('routeId', false)],
      },
      {
        id: 'medical-iot-dashboard',
        name: 'Medical IoT Dashboard',
        description: 'Demo-backed device registry, telemetry, and alert snapshot.',
        category: 'iot',
        executionKind: 'live-tracking',
        aliases: ['device-fleet-management', 'telemetry-monitoring', 'asset-tracking-dashboard'],
        launch: {
          path: '/medical-iot',
          registryId: 'medical-iot-dashboard',
          chatSeed: guardedSeed('Medical IoT Dashboard'),
          orchestratorTool: null,
          openLabel: 'Open IoT dashboard',
        },
        requiredParameters: [],
        optionalParameters: [makeParameter('deviceId', false), makeParameter('patientId', false)],
      },
    ];
  }

  private buildPlatformDefinitions(): ToolDefinition[] {
    return [
      ['calculator-recommender-ai', 'Calculator Recommendation AI'],
      ['workflow-builder-ai', 'Workflow Builder AI'],
      ['clinical-reasoning-engine', 'Clinical Reasoning Engine'],
      ['patient-summary-ai', 'Patient Summary AI'],
      ['clinical-event-ai', 'Clinical Event AI'],
      ['soap-builder', 'SOAP Builder'],
    ].map(([id, name]) => ({
      id,
      name,
      description: `${name} platform capability. Demo output requires human review.`,
      category: 'backend-executor' as const,
      executionKind: 'platform-demo' as const,
      platformCapabilityId: id,
      launch: {
        path: '/assistant',
        registryId: id,
        chatSeed: guardedSeed(name),
        orchestratorTool: null,
        openLabel: 'Run in chat',
      },
      requiredParameters: [],
      optionalParameters: [makeParameter('patientId', false)],
    }));
  }
}
