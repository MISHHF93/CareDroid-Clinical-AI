import { PrimaryIntent } from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import { ParameterCollectorService } from './parameter-collector.service';
import { ToolExecutionService } from './tool-execution.service';
import { ToolResolverService } from './tool-resolver.service';
import { ValidationService } from './validation.service';
import { ToolDefinition } from './tool-calling.types';

const aiService = {
  generateStructuredJSON: jest.fn(),
};

function makeValidationService() {
  return new ValidationService({
    validateToolExecution: jest.fn().mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    }),
  } as any);
}

function makeExecutionService() {
  const resolver = new ToolResolverService();
  const collector = new ParameterCollectorService(aiService as any);
  const toolOrchestrator = {
    validateToolExecution: jest.fn().mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    }),
    executeInChat: jest.fn().mockResolvedValue({
      toolName: 'SOFA Score Calculator',
      formattedForChat: '**SOFA Score Calculator**',
      result: {
        success: true,
        data: { totalScore: 2 },
        timestamp: new Date('2026-05-25T00:00:00.000Z'),
      },
    }),
    saveToolResult: jest.fn().mockResolvedValue({ id: 'log-1' }),
  };
  const automationAuditService = {
    createEvent: jest.fn().mockResolvedValue({ id: 'automation-audit-1' }),
  };
  const service = new ToolExecutionService(
    {
      classify: jest.fn().mockResolvedValue({
        primaryIntent: PrimaryIntent.CLINICAL_TOOL,
        toolId: 'fleet-live-map',
        confidence: 0.9,
        method: 'keyword',
        extractedParameters: {},
        isEmergency: false,
        emergencyKeywords: [],
        matchedPatterns: [],
        classifiedAt: new Date(),
      }),
    } as any,
    resolver,
    collector,
    new ValidationService(toolOrchestrator as any),
    toolOrchestrator as any,
    {
      getFloorPlan: jest.fn().mockReturnValue({ floors: [] }),
    } as any,
    {
      getDeviceLocations: jest.fn().mockResolvedValue({ devices: [] }),
    } as any,
    {
      getActiveRoutes: jest.fn().mockResolvedValue({ routes: [] }),
      getFleetAlerts: jest.fn().mockResolvedValue({ alerts: [] }),
    } as any,
    {
      getLiveVehicles: jest.fn().mockResolvedValue({ vehicles: [] }),
    } as any,
    {
      getLiveTelemetry: jest.fn().mockResolvedValue({ vitals: [] }),
    } as any,
    {
      getLiveDevices: jest.fn().mockResolvedValue({ devices: [] }),
    } as any,
    {
      getDeviceAlerts: jest.fn().mockResolvedValue({ alerts: [] }),
    } as any,
    {
      demo: jest.fn().mockReturnValue({
        status: 'demo_review_required',
        reviewRequired: true,
      }),
    } as any,
    automationAuditService as any,
  );

  return { service, toolOrchestrator, automationAuditService };
}

describe('ToolResolverService', () => {
  it('integrates resolveCatalogLaunch for fleet aliases', () => {
    const resolver = new ToolResolverService();

    expect(resolver.resolveCatalogLaunch('route-optimizer')).toMatchObject({
      path: '/fleet/map',
      registryId: 'fleet-live-map',
      openLabel: 'Open fleet map',
    });
  });

  it('resolves prompt intent into the catalog', () => {
    const resolver = new ToolResolverService();
    const resolution = resolver.resolve({ prompt: 'Show the fleet vehicle map' });

    expect(resolution.definition?.id).toBe('fleet-live-map');
    expect(resolution.definition?.category).toBe('fleet');
  });
});

describe('ParameterCollectorService', () => {
  beforeEach(() => {
    aiService.generateStructuredJSON.mockReset();
  });

  it('collects labeled required parameters from the prompt', async () => {
    const collector = new ParameterCollectorService(aiService as any);
    const definition: ToolDefinition = {
      id: 'patient-summary-ai',
      name: 'Patient Summary AI',
      description: 'Test definition',
      category: 'backend-executor',
      executionKind: 'platform-demo',
      launch: {
        path: '/assistant',
        registryId: 'patient-summary-ai',
        chatSeed: null,
        orchestratorTool: null,
        openLabel: 'Run in chat',
      },
      requiredParameters: [
        {
          name: 'patientId',
          type: 'string',
          required: true,
          description: 'Patient identifier',
        },
      ],
      optionalParameters: [],
    };

    const result = await collector.collect({
      prompt: 'Create a summary for patient id: demo-123',
      definition,
      useAiExtraction: false,
    });

    expect(result.needsFollowUp).toBe(false);
    expect(result.parameters.patientId).toBe('demo-123');
    expect(result.collectedFrom).toContain('heuristic');
  });

  it('returns missing parameter follow-up state', async () => {
    const collector = new ParameterCollectorService(aiService as any);
    const definition: ToolDefinition = {
      id: 'demo-tool',
      name: 'Demo Tool',
      description: 'Test definition',
      category: 'backend-executor',
      executionKind: 'platform-demo',
      launch: {
        path: '/assistant',
        registryId: 'demo-tool',
        chatSeed: null,
        orchestratorTool: null,
        openLabel: 'Run in chat',
      },
      requiredParameters: [
        {
          name: 'patientId',
          type: 'string',
          required: true,
          description: 'Patient identifier',
        },
      ],
      optionalParameters: [],
    };

    const result = await collector.collect({
      prompt: 'Create a summary',
      definition,
      useAiExtraction: false,
    });

    expect(result.needsFollowUp).toBe(true);
    expect(result.missingRequired.map((param) => param.name)).toEqual(['patientId']);
    expect(result.followUpMessage).toContain('patientId');
  });
});

describe('ValidationService', () => {
  it('adds safety warnings for live tracking tools', async () => {
    const resolver = new ToolResolverService();
    const definition = resolver.resolve({ requestedToolId: 'medical-iot-dashboard' }).definition!;
    const validation = await makeValidationService().validate({
      definition,
      parameters: {},
    });

    expect(validation.valid).toBe(true);
    expect(validation.warnings.join(' ')).toContain('demo-backed operational telemetry');
  });
});

describe('ToolExecutionService', () => {
  beforeEach(() => {
    aiService.generateStructuredJSON.mockReset();
  });

  it('executes a live-tracking fleet tool and records logs', async () => {
    const { service, toolOrchestrator } = makeExecutionService();

    const result = await service.executePrompt({
      prompt: 'Show the fleet vehicle map',
      toolId: 'fleet-live-map',
      parameters: {},
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('executed');
    expect(result.category).toBe('fleet');
    expect(result.executionLogs.map((entry) => entry.phase)).toEqual(
      expect.arrayContaining(['resolution', 'parameter_collection', 'validation', 'execution']),
    );
    expect(toolOrchestrator.saveToolResult).toHaveBeenCalledWith(
      expect.objectContaining({ toolType: 'fleet-live-map' }),
    );
  });

  it('returns structured fallback for unsupported tools', async () => {
    const { service, automationAuditService } = makeExecutionService();

    const result = await service.executePrompt({
      prompt: 'Run a made-up executor',
      toolId: 'not-a-tool',
      parameters: {},
      userId: 'user-1',
      context: {
        tenant: {
          organizationId: 'org-1',
          workspaceId: 'workspace-1',
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('unsupported');
    expect(result.visualizations?.[0]).toMatchObject({
      type: 'unsupported-tool',
    });
    expect(result.executionLogs.some((entry) => entry.phase === 'fallback')).toBe(true);
    expect(automationAuditService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerFired: 'Tool execution requested',
        toolCalled: 'not-a-tool',
        status: 'blocked',
        reason: 'unsupported-tool',
      }),
      expect.objectContaining({
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
      }),
      expect.objectContaining({ id: 'user-1' }),
    );
  });
});
