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

  /**
   * Get metadata for a specific tool
   */
  getToolMetadata(toolId: string): ToolMetadata & { parameters: any[] } {
    const tool = this.getTool(toolId);
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
  }> {
    try {
      const tool = this.getTool(dto.toolId);
      return tool.validate(dto.parameters);
    } catch (error) {
      if (error instanceof Error) {
        return {
          valid: false,
          errors: [error.message],
          warnings: [],
        };
      }
      return {
        valid: false,
        errors: ['Unknown validation error'],
        warnings: [],
      };
    }
  }

  /**
   * Execute a clinical tool
   */
  async executeTool(dto: ExecuteToolDto): Promise<ToolExecutionResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Executing tool: ${dto.toolId}`);

    try {
      // Get the tool
      const tool = this.getTool(dto.toolId);
      const metadata = tool.getMetadata();

      // Calculate and record parameter complexity
      const complexity = this.toolMetrics.calculateParameterComplexity(dto.parameters);
      const complexityLabel = complexity.category;
      this.toolMetrics.setToolParameterComplexity(dto.toolId, complexityLabel, complexity.score);

      // Validate parameters
      const validation = tool.validate(dto.parameters);
      if (!validation.valid) {
        // Record validation error
        this.toolMetrics.recordToolError(dto.toolId, 'validation');

        await this.auditService.log({
          userId: dto.userId,
          action: AuditAction.AI_QUERY,
          resource: `tools/${dto.toolId}`,
          ipAddress: '0.0.0.0',
          userAgent: 'tool-orchestrator',
          metadata: {
            status: 'validation_failed',
            errors: validation.errors,
            parameters: dto.parameters,
          },
        });

        return {
          toolId: dto.toolId,
          toolName: metadata.name,
          success: false,
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

      // Execute the tool
      const result = await tool.execute(dto.parameters);
      const executionTime = Date.now() - startTime;

      // Record execution time tier metrics
      this.toolMetrics.recordToolExecutionTier(dto.toolId, executionTime);

      // Audit the execution
      await this.auditService.log({
        userId: dto.userId,
        action: AuditAction.AI_QUERY,
        resource: `tools/${dto.toolId}`,
        ipAddress: '0.0.0.0',
        userAgent: 'tool-orchestrator',
        metadata: {
          status: result.success ? 'success' : 'failed',
          executionTimeMs: executionTime,
          parametersCount: Object.keys(dto.parameters).length,
          hasWarnings: (result.warnings?.length || 0) > 0,
          hasErrors: (result.errors?.length || 0) > 0,
        },
      });

      this.logger.log(
        `Tool execution completed: ${dto.toolId} (${result.success ? 'success' : 'failed'}) in ${executionTime}ms`
      );

      return {
        toolId: dto.toolId,
        toolName: metadata.name,
        success: result.success,
        result,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Categorize and record error
      const errorType = this.toolMetrics.categorizeError(error);
      this.toolMetrics.recordToolError(dto.toolId, errorType);
      
      this.logger.error(`Tool execution error: ${dto.toolId}`, error);

      await this.auditService.log({
        userId: dto.userId,
        action: AuditAction.SECURITY_EVENT,
        resource: `tools/${dto.toolId}`,
        ipAddress: '0.0.0.0',
        userAgent: 'tool-orchestrator',
        metadata: {
          status: 'error',
          error: errorMessage,
          executionTimeMs: executionTime,
        },
      });

      return {
        toolId: dto.toolId,
        toolName: dto.toolId,
        success: false,
        result: {
          success: false,
          data: {},
          errors: [errorMessage],
          timestamp: new Date(),
        },
        executionTimeMs: executionTime,
      };
    }
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
    } else if (response.toolId === 'drug-interactions' || response.toolId === 'drug-interaction-checker') {
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
