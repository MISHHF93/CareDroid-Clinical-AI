/**
 * Tool Orchestrator Service
 * 
 * Central coordinator for all clinical tools.
 * Manages tool registry, execution, validation, and result formatting.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { ToolMetricsService } from '../../metrics/tool-metrics.service';
import { SubscriptionTier } from '../../subscriptions/entities/subscription.entity';
import {
  ClinicalToolService,
  ToolMetadata,
  ToolExecutionResult,
} from './interfaces/clinical-tool.interface';
import { SofaCalculatorService } from './services/sofa-calculator.service';
import { DrugCheckerService } from './services/drug-checker.service';
import { LabInterpreterService } from './services/lab-interpreter.service';
import { ExecuteToolDto, ToolExecutionResponseDto, ToolListDto } from './dto/tool-execution.dto';
import { ToolResult } from './entities/tool-result.entity';
import {
  classifyToolExecutionError,
  getExecutorCatalogSnapshot,
  resolveExecutorToolId,
  ToolExecutionErrorCode,
  validateExecutorContractParameters,
  validateExecutorRequestPayload,
} from './tool-orchestrator.registry';

interface ToolRegistry {
  [toolId: string]: ClinicalToolService;
}

interface ChatToolResult {
  type: 'tool_result';
  toolId: string;
  toolName: string;
  result: ToolExecutionResult;
  formattedForChat: string;
}

@Injectable()
export class ToolOrchestratorService {
  private readonly logger = new Logger(ToolOrchestratorService.name);
  private readonly toolRegistry: ToolRegistry = {};

  constructor(
    private readonly sofaCalculatorService: SofaCalculatorService,
    private readonly drugCheckerService: DrugCheckerService,
    private readonly labInterpreterService: LabInterpreterService,
    private readonly auditService: AuditService,
    private readonly toolMetrics: ToolMetricsService,
    @InjectRepository(ToolResult)
    private readonly toolResultRepository: Repository<ToolResult>,
  ) {
    this.initializeRegistry();
  }

  /**
   * Initialize the tool registry with all available tools
   */
  private initializeRegistry(): void {
    this.registerTool(this.sofaCalculatorService);
    this.registerTool(this.drugCheckerService);
    this.registerTool(this.labInterpreterService);
    
    this.logger.log(`Initialized tool registry with ${Object.keys(this.toolRegistry).length} tools`);
  }

  /**
   * Register a clinical tool
   */
  private registerTool(tool: ClinicalToolService): void {
    const metadata = tool.getMetadata();
    this.toolRegistry[metadata.id] = tool;
    this.logger.log(`Registered tool: ${metadata.id} (${metadata.name})`);
  }

  /**
   * Get list of all available tools
   */
  listAvailableTools(): ToolListDto {
    const tools = Object.values(this.toolRegistry).map(tool => ({
      ...tool.getMetadata(),
      parameters: tool.getSchema(),
    }));

    return {
      tools,
      count: tools.length,
    };
  }

  /** Executor mapping audit + documented frontend-only NLU tools (no fake executors). */
  getExecutorCatalog() {
    return getExecutorCatalogSnapshot();
  }

  /**
   * Get metadata for a specific tool
   */
  getToolMetadata(toolId: string): ToolMetadata & { parameters: any[] } {
    const resolved = resolveExecutorToolId(toolId);
    if (!resolved) {
      throw new NotFoundException(`Tool not found: ${toolId}`);
    }
    const tool = this.getTool(resolved.resolvedId);
    return {
      ...tool.getMetadata(),
      parameters: tool.getSchema(),
    };
  }

  /**
   * Get available tools by subscription tier
   */
  getToolsBySubscriptionTier(tier: SubscriptionTier): ToolListDto {
    const toolAccessMap: Record<SubscriptionTier, string[]> = {
      [SubscriptionTier.FREE]: ['sofa-calculator'],
      [SubscriptionTier.PROFESSIONAL]: ['sofa-calculator', 'drug-interactions'],
      [SubscriptionTier.INSTITUTIONAL]: ['sofa-calculator', 'drug-interactions', 'lab-interpreter'],
    };

    const allowedToolIds = toolAccessMap[tier] || toolAccessMap[SubscriptionTier.FREE];
    const tools = allowedToolIds
      .map(toolId => {
        try {
          const tool = this.getTool(toolId);
          return {
            ...tool.getMetadata(),
            parameters: tool.getSchema(),
          };
        } catch {
          return null;
        }
      })
      .filter(tool => tool !== null);

    return {
      tools,
      count: tools.length,
      tier,
      message: `${tools.length} tools available for ${tier} subscription`,
    };
  }

  /**
   * Validate tool execution request
   */
  async validateToolExecution(dto: ExecuteToolDto): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    errorCode?: ToolExecutionErrorCode;
    resolvedToolId?: string;
  }> {
    const requestCheck = validateExecutorRequestPayload(dto.parameters);
    if (!requestCheck.valid) {
      return {
        valid: false,
        errors: requestCheck.errors,
        warnings: [],
        errorCode: ToolExecutionErrorCode.INVALID_REQUEST,
      };
    }

    const resolved = resolveExecutorToolId(dto.toolId);
    if (!resolved) {
      return {
        valid: false,
        errors: [`Tool not found: ${dto.toolId}`],
        warnings: [],
        errorCode: classifyToolExecutionError(dto.toolId),
      };
    }

    const contractCheck = validateExecutorContractParameters(
      resolved.resolvedId,
      dto.parameters as Record<string, unknown>,
    );
    if (!contractCheck.valid) {
      return {
        valid: false,
        errors: contractCheck.errors,
        warnings: [],
        resolvedToolId: resolved.resolvedId,
        errorCode: ToolExecutionErrorCode.VALIDATION_FAILED,
      };
    }

    const tool = this.getTool(resolved.resolvedId);
    const validation = tool.validate(dto.parameters);
    return {
      ...validation,
      resolvedToolId: resolved.resolvedId,
      errorCode: validation.valid ? undefined : ToolExecutionErrorCode.VALIDATION_FAILED,
    };
  }

  /**
   * Execute a clinical tool
   */
  async executeTool(dto: ExecuteToolDto): Promise<ToolExecutionResponseDto> {
    const startTime = Date.now();
    const requestedToolId = dto.toolId;
    this.logger.log(`Executing tool: ${requestedToolId}`);

    const requestCheck = validateExecutorRequestPayload(dto.parameters);
    if (!requestCheck.valid) {
      return this.buildExecutionErrorResponse({
        requestedToolId,
        toolName: requestedToolId,
        errors: requestCheck.errors,
        errorCode: ToolExecutionErrorCode.INVALID_REQUEST,
        startTime,
        auditStatus: 'invalid_request',
        userId: dto.userId,
      });
    }

    const resolved = resolveExecutorToolId(requestedToolId);
    if (!resolved) {
      const errorCode = classifyToolExecutionError(requestedToolId);
      await this.auditService.log({
        userId: dto.userId,
        action: AuditAction.SECURITY_EVENT,
        resource: `tools/${requestedToolId}`,
        ipAddress: '0.0.0.0',
        userAgent: 'tool-orchestrator',
        metadata: {
          status: errorCode === ToolExecutionErrorCode.UNSUPPORTED_TOOL ? 'unsupported' : 'not_found',
          errorCode,
          requestedToolId,
        },
      });

      return this.buildExecutionErrorResponse({
        requestedToolId,
        toolName: requestedToolId,
        errors: [
          errorCode === ToolExecutionErrorCode.UNSUPPORTED_TOOL
            ? `Tool is not available for server execution: ${requestedToolId}`
            : `Tool not found: ${requestedToolId}`,
        ],
        errorCode,
        startTime,
        auditStatus: 'skipped',
        userId: dto.userId,
      });
    }

    const canonicalToolId = resolved.resolvedId;

    const contractCheck = validateExecutorContractParameters(
      canonicalToolId,
      dto.parameters as Record<string, unknown>,
    );
    if (!contractCheck.valid) {
      await this.auditService.log({
        userId: dto.userId,
        action: AuditAction.AI_QUERY,
        resource: `tools/${canonicalToolId}`,
        ipAddress: '0.0.0.0',
        userAgent: 'tool-orchestrator',
        metadata: {
          status: 'validation_failed',
          errorCode: ToolExecutionErrorCode.VALIDATION_FAILED,
          phase: 'contract',
          requestedToolId,
          resolvedToolId: canonicalToolId,
          errors: contractCheck.errors,
        },
      });

      return {
        toolId: canonicalToolId,
        requestedToolId,
        resolvedToolId: canonicalToolId,
        toolName: canonicalToolId,
        success: false,
        errorCode: ToolExecutionErrorCode.VALIDATION_FAILED,
        result: {
          success: false,
          data: {},
          errors: contractCheck.errors,
          timestamp: new Date(),
        },
        executionTimeMs: Date.now() - startTime,
      };
    }

    try {
      const tool = this.getTool(canonicalToolId);
      const metadata = tool.getMetadata();

      const complexity = this.toolMetrics.calculateParameterComplexity(dto.parameters);
      const complexityLabel = complexity.category;
      this.toolMetrics.setToolParameterComplexity(
        canonicalToolId,
        complexityLabel,
        complexity.score,
      );

      const validation = tool.validate(dto.parameters);
      if (!validation.valid) {
        this.toolMetrics.recordToolError(canonicalToolId, 'validation');

        await this.auditService.log({
          userId: dto.userId,
          action: AuditAction.AI_QUERY,
          resource: `tools/${canonicalToolId}`,
          ipAddress: '0.0.0.0',
          userAgent: 'tool-orchestrator',
          metadata: {
            status: 'validation_failed',
            errorCode: ToolExecutionErrorCode.VALIDATION_FAILED,
            requestedToolId,
            resolvedToolId: canonicalToolId,
            aliased: resolved.aliased,
            errors: validation.errors,
            parametersCount: Object.keys(dto.parameters).length,
          },
        });

        return {
          toolId: canonicalToolId,
          requestedToolId,
          resolvedToolId: canonicalToolId,
          toolName: metadata.name,
          success: false,
          errorCode: ToolExecutionErrorCode.VALIDATION_FAILED,
          result: {
            success: false,
            data: {},
            errors: validation.errors,
            warnings: validation.warnings,
            timestamp: new Date(),
          },
          executionTimeMs: Date.now() - startTime,
        };
      }

      const result = await tool.execute(dto.parameters);
      const executionTime = Date.now() - startTime;

      this.toolMetrics.recordToolExecutionTier(canonicalToolId, executionTime);

      await this.auditService.log({
        userId: dto.userId,
        action: AuditAction.AI_QUERY,
        resource: `tools/${canonicalToolId}`,
        ipAddress: '0.0.0.0',
        userAgent: 'tool-orchestrator',
        metadata: {
          status: result.success ? 'success' : 'failed',
          errorCode: result.success ? undefined : ToolExecutionErrorCode.EXECUTION_FAILED,
          executionTimeMs: executionTime,
          requestedToolId,
          resolvedToolId: canonicalToolId,
          aliased: resolved.aliased,
          parametersCount: Object.keys(dto.parameters).length,
          hasWarnings: (result.warnings?.length || 0) > 0,
          hasErrors: (result.errors?.length || 0) > 0,
        },
      });

      this.logger.log(
        `Tool execution completed: ${canonicalToolId} (${result.success ? 'success' : 'failed'}) in ${executionTime}ms`,
      );

      return {
        toolId: canonicalToolId,
        requestedToolId,
        resolvedToolId: canonicalToolId,
        toolName: metadata.name,
        success: result.success,
        errorCode: result.success ? undefined : ToolExecutionErrorCode.EXECUTION_FAILED,
        result,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorType = this.toolMetrics.categorizeError(error);
      this.toolMetrics.recordToolError(canonicalToolId, errorType);

      this.logger.error(`Tool execution error: ${canonicalToolId}`, error);

      await this.auditService.log({
        userId: dto.userId,
        action: AuditAction.SECURITY_EVENT,
        resource: `tools/${canonicalToolId}`,
        ipAddress: '0.0.0.0',
        userAgent: 'tool-orchestrator',
        metadata: {
          status: 'error',
          errorCode: ToolExecutionErrorCode.EXECUTION_FAILED,
          error: errorMessage,
          executionTimeMs: executionTime,
          requestedToolId,
          resolvedToolId: canonicalToolId,
        },
      });

      return this.buildExecutionErrorResponse({
        requestedToolId,
        resolvedToolId: canonicalToolId,
        toolName: canonicalToolId,
        errors: [errorMessage],
        errorCode: ToolExecutionErrorCode.EXECUTION_FAILED,
        startTime,
        auditStatus: 'skipped',
        userId: dto.userId,
      });
    }
  }

  private buildExecutionErrorResponse(args: {
    requestedToolId: string;
    resolvedToolId?: string;
    toolName: string;
    errors: string[];
    errorCode: ToolExecutionErrorCode;
    startTime: number;
    auditStatus: string;
    userId?: string;
  }): ToolExecutionResponseDto {
    return {
      toolId: args.resolvedToolId ?? args.requestedToolId,
      requestedToolId: args.requestedToolId,
      resolvedToolId: args.resolvedToolId,
      toolName: args.toolName,
      success: false,
      errorCode: args.errorCode,
      result: {
        success: false,
        data: {},
        errors: args.errors,
        timestamp: new Date(),
      },
      executionTimeMs: Date.now() - args.startTime,
    };
  }

  /**
   * Execute tool and format result for chat display
   * This is the main method used by ChatService
   */
  async executeInChat(
    toolId: string,
    parameters: Record<string, any>,
    userId: string,
    conversationId: string,
  ): Promise<ChatToolResult> {
    this.logger.log(`Executing tool in chat context: ${toolId} for user ${userId}`);

    const dto: ExecuteToolDto = {
      toolId,
      parameters,
      userId,
      conversationId,
    };

    const response = await this.executeTool(dto);
    const formattedText = this.formatToolResultForChat(response);

    return {
      type: 'tool_result',
      toolId: response.toolId,
      toolName: response.toolName,
      result: response.result,
      formattedForChat: formattedText,
    };
  }

  /**
   * Format tool execution result for chat display
   */
  private formatToolResultForChat(response: ToolExecutionResponseDto): string {
    if (!response.success) {
      const errors = response.result.errors?.join(', ') || 'Unknown error';
      return `❌ **${response.toolName} Error**\n\n${errors}`;
    }

    let output = `✅ **${response.toolName}**\n\n`;

    // Add interpretation if available
    if (response.result.interpretation) {
      output += `${response.result.interpretation}\n\n`;
    }

    // Add key data points (tool-specific formatting)
    if (response.toolId === 'sofa-calculator') {
      output += this.formatSofaResult(response.result.data);
    } else if (response.toolId === 'drug-interactions') {
      output += this.formatDrugCheckerResult(response.result.data);
    } else if (response.toolId === 'lab-interpreter') {
      output += this.formatLabInterpreterResult(response.result.data);
    }

    // Add warnings if present
    if (response.result.warnings && response.result.warnings.length > 0) {
      output += `\n⚠️ **Warnings:**\n${response.result.warnings.map(w => `- ${w}`).join('\n')}\n`;
    }

    // Add disclaimer
    if (response.result.disclaimer) {
      output += `\n_${response.result.disclaimer}_\n`;
    }

    // Add execution time
    output += `\n_Executed in ${response.executionTimeMs}ms_`;

    return output;
  }

  private formatSofaResult(data: any): string {
    let output = `**Total SOFA Score: ${data.totalScore}** (Range: 0-24)\n\n`;
    
    output += '**Component Scores:**\n';
    if (data.respirationScore !== undefined) output += `- Respiration: ${data.respirationScore}\n`;
    if (data.coagulationScore !== undefined) output += `- Coagulation: ${data.coagulationScore}\n`;
    if (data.liverScore !== undefined) output += `- Liver: ${data.liverScore}\n`;
    if (data.cardiovascularScore !== undefined) output += `- Cardiovascular: ${data.cardiovascularScore}\n`;
    if (data.cnsScore !== undefined) output += `- CNS: ${data.cnsScore}\n`;
    if (data.renalScore !== undefined) output += `- Renal: ${data.renalScore}\n`;
    
    if (data.mortalityEstimate) {
      output += `\n**Mortality Estimate:** ${data.mortalityEstimate}\n`;
    }

    return output;
  }

  private formatDrugCheckerResult(data: any): string {
    if (!data.interactions || data.interactions.length === 0) {
      return '✅ No significant drug interactions detected.\n';
    }

    let output = `**${data.interactions.length} Interaction(s) Detected**\n\n`;

    // Group by severity
    const bySeverity = {
      contraindicated: data.interactions.filter((i: any) => i.severity === 'contraindicated'),
      major: data.interactions.filter((i: any) => i.severity === 'major'),
      moderate: data.interactions.filter((i: any) => i.severity === 'moderate'),
      minor: data.interactions.filter((i: any) => i.severity === 'minor'),
    };

    if (bySeverity.contraindicated.length > 0) {
      output += '🚫 **Contraindicated:**\n';
      for (const interaction of bySeverity.contraindicated) {
        output += `- ${interaction.drug1} + ${interaction.drug2}: ${interaction.description}\n`;
      }
      output += '\n';
    }

    if (bySeverity.major.length > 0) {
      output += '⚠️ **Major:**\n';
      for (const interaction of bySeverity.major) {
        output += `- ${interaction.drug1} + ${interaction.drug2}: ${interaction.description}\n`;
      }
      output += '\n';
    }

    if (bySeverity.moderate.length > 0) {
      output += '⚡ **Moderate:**\n';
      for (const interaction of bySeverity.moderate.slice(0, 3)) {
        output += `- ${interaction.drug1} + ${interaction.drug2}: ${interaction.description}\n`;
      }
      if (bySeverity.moderate.length > 3) {
        output += `- _...and ${bySeverity.moderate.length - 3} more_\n`;
      }
    }

    return output;
  }

  private formatLabInterpreterResult(data: any): string {
    let output = '';

    if (data.summary) {
      output += `**Summary:** ${data.summary.abnormal} of ${data.summary.total} values abnormal`;
      if (data.summary.critical > 0) {
        output += ` (🚨 ${data.summary.critical} critical)`;
      }
      output += '\n\n';
    }

    if (data.criticalValues && data.criticalValues.length > 0) {
      output += '🚨 **Critical Values:**\n';
      for (const lab of data.criticalValues) {
        output += `- ${lab.name}: ${lab.value} ${lab.unit} (${lab.status})\n`;
      }
      output += '\n';
    }

    if (data.interpretations) {
      for (const interp of data.interpretations) {
        if (interp.findings && interp.findings.length > 0) {
          output += `**${interp.category}:**\n`;
          output += `${interp.clinicalSignificance}\n\n`;
        }
      }
    }

    return output;
  }

  /**
   * Get a tool from the registry
   */
  private getTool(toolId: string): ClinicalToolService {
    const tool = this.toolRegistry[toolId];
    if (!tool) {
      throw new NotFoundException(`Tool not found: ${toolId}`);
    }
    return tool;
  }

  /**
   * Persist tool result for analytics and sync
   */
  async saveToolResult(payload: {
    userId?: string;
    toolType: string;
    input?: Record<string, any>;
    output?: Record<string, any>;
    timestamp?: string | Date;
  }) {
    const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

    const entity = this.toolResultRepository.create({
      userId: payload.userId,
      toolType: payload.toolType,
      input: payload.input || {},
      output: payload.output || {},
      timestamp,
    });

    return this.toolResultRepository.save(entity);
  }

  /**
   * Get tool statistics
   */
  getToolStatistics(): {
    totalTools: number;
    toolsByCategory: Record<string, number>;
    tools: Array<{ id: string; name: string; category: string }>;
  } {
    const tools = Object.values(this.toolRegistry).map(tool => tool.getMetadata());
    
    const byCategory: Record<string, number> = {};
    for (const tool of tools) {
      byCategory[tool.category] = (byCategory[tool.category] || 0) + 1;
    }

    return {
      totalTools: tools.length,
      toolsByCategory: byCategory,
      tools: tools.map(t => ({ id: t.id, name: t.name, category: t.category })),
    };
  }
}
