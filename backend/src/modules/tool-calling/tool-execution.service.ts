import { Injectable, Logger, Optional } from '@nestjs/common';
import { IntentClassifierService } from '../medical-control-plane/intent-classifier/intent-classifier.service';
import { ToolOrchestratorService } from '../medical-control-plane/tool-orchestrator/tool-orchestrator.service';
import { ToolExecutionErrorCode } from '../medical-control-plane/tool-orchestrator/tool-orchestrator.registry';
import { FloorService } from '../hospital-map/floor.service';
import { DeviceLocationService } from '../hospital-map/device-location.service';
import { FleetService } from '../fleet/fleet.service';
import { VehicleTrackingService } from '../fleet/vehicle-tracking.service';
import { AlertService } from '../telemetry/alert.service';
import { DeviceRegistryService } from '../telemetry/device-registry.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { PlatformSystemsService } from '../platform-systems/platform-systems.service';
import { AutomationAuditService } from '../automation-audit/automation-audit.service';
import { AutomationAuditStatus } from '../automation-audit/entities/automation-audit-event.entity';
import { ParameterCollectorService } from './parameter-collector.service';
import { ToolResolverService } from './tool-resolver.service';
import { ValidationService } from './validation.service';
import {
  ToolCallingRequest,
  ToolCallingResult,
  ToolDefinition,
  ToolExecutionLogEntry,
  ToolResolution,
} from './tool-calling.types';

@Injectable()
export class ToolExecutionService {
  private readonly logger = new Logger(ToolExecutionService.name);
  private readonly executionLogs: ToolExecutionLogEntry[] = [];

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly resolver: ToolResolverService,
    private readonly parameterCollector: ParameterCollectorService,
    private readonly validationService: ValidationService,
    private readonly toolOrchestrator: ToolOrchestratorService,
    private readonly floorService: FloorService,
    private readonly deviceLocationService: DeviceLocationService,
    private readonly fleetService: FleetService,
    private readonly vehicleTrackingService: VehicleTrackingService,
    private readonly telemetryService: TelemetryService,
    private readonly deviceRegistryService: DeviceRegistryService,
    private readonly alertService: AlertService,
    private readonly platformSystemsService: PlatformSystemsService,
    @Optional() private readonly automationAuditService?: AutomationAuditService,
  ) {}

  async executePrompt(request: ToolCallingRequest): Promise<ToolCallingResult> {
    const startedAt = Date.now();
    const logs: ToolExecutionLogEntry[] = [];
    const userId = request.userId || 'anonymous';
    const conversationId = request.conversationId || `tool-calling-${startedAt}`;

    const classification =
      request.classification || (await this.classifyPrompt(request.prompt, userId, logs));

    const resolution = this.resolver.resolve({
      prompt: request.prompt,
      requestedToolId: request.toolId,
      classifiedToolId: classification?.toolId,
      confidence: classification?.confidence,
    });
    this.recordLog(
      logs,
      userId,
      'resolution',
      resolution.definition ? 'success' : 'fallback',
      resolution.reason,
      {
        requestedToolId: resolution.requestedToolId,
        resolvedToolId: resolution.resolvedToolId,
      },
    );

    if (!resolution.definition) {
      return this.buildUnsupportedResponse(request, resolution, logs, startedAt, classification);
    }

    const parameterState = await this.parameterCollector.collect({
      prompt: request.prompt,
      definition: resolution.definition,
      initialParameters: request.parameters,
      extractedParameters: classification?.extractedParameters,
      userId,
      context: request.context,
    });
    this.recordLog(
      logs,
      userId,
      'parameter_collection',
      parameterState.needsFollowUp ? 'missing_parameters' : 'success',
      parameterState.needsFollowUp
        ? `Missing ${parameterState.missingRequired.length} required parameters.`
        : `Collected ${Object.keys(parameterState.parameters).length} parameters.`,
      {
        collectedFrom: parameterState.collectedFrom,
        missing: parameterState.missingRequired.map((param) => param.name),
      },
    );

    if (parameterState.needsFollowUp) {
      await this.recordBlockedAutomation(request, {
        toolId: resolution.definition.id,
        triggerFired: 'Tool execution requested',
        actionSelected: 'Collect required tool parameters',
        reason: 'needs_parameters',
        conditionsEvaluated: parameterState.missingRequired.map((param) => ({
          label: `Required parameter present: ${param.name}`,
          result: false,
        })),
      });
      return {
        success: false,
        status: 'needs_parameters',
        text:
          parameterState.followUpMessage ||
          `I need more information to run ${resolution.definition.name}.`,
        toolId: resolution.definition.id,
        toolName: resolution.definition.name,
        category: resolution.definition.category,
        launch: resolution.launch,
        parameters: parameterState.parameters,
        missingParameters: parameterState.missingRequired,
        intentClassification: classification,
        executionLogs: logs,
        context: this.buildToolContext(resolution.definition, parameterState.parameters),
        suggestions: parameterState.missingRequired.map((param) => `Provide ${param.name}`),
        visualizations: [
          {
            type: 'tool-parameter-request',
            data: {
              toolId: resolution.definition.id,
              missingParameters: parameterState.missingRequired,
            },
          },
        ],
        executionTimeMs: Date.now() - startedAt,
      };
    }

    const validation = await this.validationService.validate({
      definition: resolution.definition,
      parameters: parameterState.parameters,
      userId,
      conversationId,
    });
    this.recordLog(
      logs,
      userId,
      'validation',
      validation.valid ? 'success' : 'failed',
      'Validated tool parameters.',
      {
        errors: validation.errors,
        warnings: validation.warnings,
      },
    );

    if (!validation.valid) {
      await this.recordBlockedAutomation(request, {
        toolId: resolution.definition.id,
        triggerFired: 'Tool execution requested',
        actionSelected: 'Validate tool parameters',
        reason: 'validation_failed',
        conditionsEvaluated: validation.errors.map((error) => ({ label: error, result: false })),
      });
      return {
        success: false,
        status: 'validation_failed',
        text: `I could not run ${resolution.definition.name}: ${validation.errors.join(', ')}`,
        toolId: resolution.definition.id,
        toolName: resolution.definition.name,
        category: resolution.definition.category,
        launch: resolution.launch,
        parameters: parameterState.parameters,
        validation,
        intentClassification: classification,
        executionLogs: logs,
        context: this.buildToolContext(resolution.definition, parameterState.parameters),
        suggestions: ['Provide corrected parameters', 'Open supported workflow'],
        visualizations: [
          {
            type: 'tool-validation',
            data: { toolId: resolution.definition.id, validation },
          },
        ],
        errorCode: ToolExecutionErrorCode.VALIDATION_FAILED,
        executionTimeMs: Date.now() - startedAt,
      };
    }

    try {
      const executed = await this.executeResolvedTool(
        resolution.definition,
        parameterState.parameters,
        userId,
        conversationId,
        { ...(request.context || {}), ...parameterState.parameters },
      );
      this.recordLog(
        logs,
        userId,
        'execution',
        'success',
        `Executed ${resolution.definition.name}.`,
        {
          executionKind: resolution.definition.executionKind,
        },
      );

      await this.persistResult(
        resolution.definition,
        userId,
        parameterState.parameters,
        executed.result,
      );

      this.recordLog(logs, userId, 'response', 'success', 'Generated tool response.');
      return {
        success: true,
        status: 'executed',
        text: executed.text,
        toolId: resolution.definition.id,
        toolName: resolution.definition.name,
        category: resolution.definition.category,
        launch: resolution.launch,
        parameters: parameterState.parameters,
        result: executed.result,
        validation,
        intentClassification: classification,
        executionLogs: logs,
        context: this.buildToolContext(
          resolution.definition,
          parameterState.parameters,
          executed.result,
        ),
        suggestions: executed.suggestions,
        visualizations: executed.visualizations,
        executionTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tool execution failed: ${message}`);
      await this.recordFailedAutomation(request, {
        toolId: resolution.definition.id,
        triggerFired: 'Tool execution requested',
        actionSelected: 'Execute backend tool',
        error: message,
      });
      this.recordLog(logs, userId, 'execution', 'failed', message, {
        toolId: resolution.definition.id,
      });
      return {
        success: false,
        status: 'failed',
        text: `I could not execute ${resolution.definition.name}: ${message}`,
        toolId: resolution.definition.id,
        toolName: resolution.definition.name,
        category: resolution.definition.category,
        launch: resolution.launch,
        parameters: parameterState.parameters,
        validation,
        intentClassification: classification,
        executionLogs: logs,
        context: this.buildToolContext(resolution.definition, parameterState.parameters),
        suggestions: ['Try again', 'Open supported workflow'],
        errorCode: ToolExecutionErrorCode.EXECUTION_FAILED,
        executionTimeMs: Date.now() - startedAt,
      };
    }
  }

  getExecutionLogs(userId: string, limit = 50): ToolExecutionLogEntry[] {
    return this.executionLogs
      .filter((entry) => entry.userId === userId)
      .slice(-limit)
      .reverse();
  }

  private async classifyPrompt(
    prompt: string,
    userId: string,
    logs: ToolExecutionLogEntry[],
  ): Promise<ToolCallingRequest['classification']> {
    try {
      const classification = await this.intentClassifier.classify(prompt, { userId });
      this.recordLog(logs, userId, 'intent', 'success', 'Classified prompt intent.', {
        intent: classification.primaryIntent,
        toolId: classification.toolId,
        confidence: classification.confidence,
        method: classification.method,
      });
      return classification;
    } catch (error) {
      this.recordLog(
        logs,
        userId,
        'intent',
        'fallback',
        `Intent classification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async executeResolvedTool(
    definition: ToolDefinition,
    parameters: Record<string, any>,
    userId: string,
    conversationId: string,
    context?: Record<string, any>,
  ): Promise<{ text: string; result: any; suggestions: string[]; visualizations: any[] }> {
    if (definition.executionKind === 'orchestrator') {
      const result = await this.toolOrchestrator.executeInChat(
        definition.executorToolId || definition.id,
        parameters,
        userId,
        conversationId,
      );
      return {
        text: result.formattedForChat,
        result: result.result,
        suggestions: ['Calculate again', 'Export results', 'View more details'],
        visualizations: [
          {
            type: 'tool-result',
            data: {
              toolId: definition.id,
              toolName: result.toolName,
              result: result.result.data,
              timestamp: result.result.timestamp,
            },
          },
        ],
      };
    }

    if (definition.executionKind === 'live-tracking') {
      const result = await this.executeLiveTrackingTool(definition, context);
      return {
        text: this.formatOperationalResponse(definition, result),
        result,
        suggestions: ['Open dashboard', 'Refresh snapshot'],
        visualizations: [
          {
            type: 'operational-tool-result',
            data: { toolId: definition.id, result },
          },
        ],
      };
    }

    if (definition.executionKind === 'platform-demo') {
      const result = this.platformSystemsService.demo(
        definition.platformCapabilityId || definition.id,
        parameters.patientId || 'demo-patient',
        parameters,
      );
      return {
        text: `**${definition.name}**\n\nThe backend capability returned a demo result that requires human review before use.`,
        result,
        suggestions: ['Review output', 'Open workflow'],
        visualizations: [
          {
            type: 'backend-executor-result',
            data: { toolId: definition.id, result },
          },
        ],
      };
    }

    throw new Error(`Unsupported execution kind: ${definition.executionKind}`);
  }

  private async executeLiveTrackingTool(definition: ToolDefinition, context?: Record<string, any>) {
    const req = context?.req || { user: { id: 'tool-calling' } };

    if (definition.id === 'hospital-map') {
      const [floors, devices] = await Promise.all([
        this.floorService.getFloorPlan(context?.floorId),
        this.deviceLocationService.getDeviceLocations(req, {
          floorId: context?.floorId,
          unitId: context?.unitId,
        }),
      ]);
      return { floors, devices };
    }

    if (definition.id === 'fleet-live-map') {
      const [vehicles, routes, alerts] = await Promise.all([
        this.vehicleTrackingService.getLiveVehicles(req),
        this.fleetService.getActiveRoutes(req),
        this.fleetService.getFleetAlerts(req),
      ]);
      return { vehicles, routes, alerts };
    }

    if (definition.id === 'medical-iot-dashboard') {
      const [devices, telemetry, alerts] = await Promise.all([
        this.deviceRegistryService.getLiveDevices(req),
        this.telemetryService.getLiveTelemetry(req),
        this.alertService.getDeviceAlerts(req),
      ]);
      return { devices, telemetry, alerts };
    }

    throw new Error(`No live-tracking executor for ${definition.id}`);
  }

  private formatOperationalResponse(definition: ToolDefinition, result: any): string {
    const warning =
      definition.category === 'map'
        ? 'Demo hospital map data returned. Not a replacement for bedside alarms.'
        : definition.category === 'fleet'
          ? 'Demo fleet telemetry returned. No autonomous dispatch action was taken.'
          : 'Demo medical IoT telemetry returned. Not a clinical alarm source.';

    return `**${definition.name}**\n\n${warning}\n\nSnapshot keys: ${Object.keys(result).join(', ')}`;
  }

  private async persistResult(
    definition: ToolDefinition,
    userId: string,
    input: Record<string, any>,
    output: any,
  ) {
    try {
      await this.toolOrchestrator.saveToolResult({
        userId,
        toolType: definition.id,
        input,
        output,
      });
    } catch (error) {
      this.logger.warn(
        `Unable to persist tool result: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async buildUnsupportedResponse(
    request: ToolCallingRequest,
    resolution: ToolResolution,
    logs: ToolExecutionLogEntry[],
    startedAt: number,
    classification: ToolCallingRequest['classification'],
  ): Promise<ToolCallingResult> {
    this.recordLog(logs, request.userId || 'anonymous', 'fallback', 'fallback', resolution.reason, {
      requestedToolId: request.toolId || classification?.toolId,
      launch: resolution.launch,
    });

    const toolId =
      request.toolId || classification?.toolId || resolution.requestedToolId || 'unknown-tool';
    await this.recordBlockedAutomation(request, {
      toolId,
      triggerFired: 'Tool execution requested',
      actionSelected: 'Resolve backend tool executor',
      reason: 'unsupported-tool',
      conditionsEvaluated: [{ label: resolution.reason, result: false }],
    });
    return {
      success: false,
      status: 'unsupported',
      text:
        `**${toolId} is not available as an automated backend executor.**\n\n` +
        'I can route you to a supported workflow when one exists, or ask follow-up questions to choose a calculator, map, fleet, IoT, or backend executor.',
      toolId,
      launch: resolution.launch,
      intentClassification: classification,
      executionLogs: logs,
      context: {
        toolId,
        launch: resolution.launch,
      },
      suggestions: ['Open supported workflow', 'Ask follow-up question'],
      visualizations: [
        {
          type: 'unsupported-tool',
          data: {
            code: ToolExecutionErrorCode.UNSUPPORTED_TOOL,
            toolId,
            launch: resolution.launch,
          },
        },
      ],
      errorCode: ToolExecutionErrorCode.UNSUPPORTED_TOOL,
      executionTimeMs: Date.now() - startedAt,
    };
  }

  private async recordBlockedAutomation(
    request: ToolCallingRequest,
    details: {
      toolId: string;
      triggerFired: string;
      actionSelected: string;
      reason: string;
      conditionsEvaluated?: { label: string; result: boolean }[];
    },
  ) {
    await this.recordAutomationAudit(request, {
      ...details,
      status: AutomationAuditStatus.BLOCKED,
    });
  }

  private async recordFailedAutomation(
    request: ToolCallingRequest,
    details: {
      toolId: string;
      triggerFired: string;
      actionSelected: string;
      error: string;
    },
  ) {
    await this.recordAutomationAudit(request, {
      ...details,
      status: AutomationAuditStatus.FAILED,
      conditionsEvaluated: [{ label: 'Backend tool executed successfully', result: false }],
    });
  }

  private async recordAutomationAudit(
    request: ToolCallingRequest,
    details: {
      toolId: string;
      triggerFired: string;
      actionSelected: string;
      status: AutomationAuditStatus;
      reason?: string;
      error?: string;
      conditionsEvaluated?: { label: string; result: boolean }[];
    },
  ) {
    if (!this.automationAuditService) return;

    const tenant = request.context?.tenant || {};
    try {
      await this.automationAuditService.createEvent(
        {
          triggerFired: details.triggerFired,
          conditionsEvaluated: details.conditionsEvaluated || [
            { label: details.reason || details.error || details.status, result: false },
          ],
          actionSelected: details.actionSelected,
          user: {
            id: request.userId || tenant.userId || 'anonymous',
            name: request.userId || tenant.userId || 'Anonymous',
          },
          tenant: {
            id: tenant.organizationId || 'unknown-tenant',
            name: tenant.organizationId || 'Unknown tenant',
          },
          workspace: {
            id: tenant.workspaceId || 'unknown-workspace',
            name: tenant.workspaceId || 'Unknown workspace',
          },
          aiInvolvement: {
            involved: true,
            summary: 'AI/tool-calling automation path evaluated a backend tool request.',
          },
          toolCalled: details.toolId,
          backendEndpoint: '/api/tool-calling/execute',
          status: details.status,
          reason: details.reason,
          error: details.error,
          timestamp: new Date().toISOString(),
          reviewer: {
            required: details.status !== AutomationAuditStatus.SUCCESS,
            name: 'Tool automation reviewer',
          },
        },
        {
          organizationId: tenant.organizationId,
          workspaceId: tenant.workspaceId,
        },
        {
          id: request.userId || tenant.userId,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to record tool automation audit: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private buildToolContext(
    definition: ToolDefinition,
    parameters: Record<string, any> = {},
    result?: any,
  ): ToolCallingResult['context'] {
    const resultData = result?.data || result;
    return {
      toolId: definition.id,
      toolName: definition.name,
      category: definition.category,
      executionKind: definition.executionKind,
      launch: definition.launch,
      parameters,
      resultSummary:
        resultData && typeof resultData === 'object'
          ? {
              keys: Object.keys(resultData).slice(0, 12),
              status: result?.success ?? result?.status,
              timestamp: result?.timestamp,
            }
          : undefined,
    };
  }

  private recordLog(
    turnLogs: ToolExecutionLogEntry[],
    userId: string,
    phase: ToolExecutionLogEntry['phase'],
    status: ToolExecutionLogEntry['status'],
    message: string,
    metadata?: Record<string, any>,
  ) {
    const entry: ToolExecutionLogEntry = {
      timestamp: new Date().toISOString(),
      userId,
      phase,
      status,
      message,
      metadata,
    };
    turnLogs.push(entry);
    this.executionLogs.push(entry);
    if (this.executionLogs.length > 500) {
      this.executionLogs.splice(0, this.executionLogs.length - 500);
    }
  }
}
