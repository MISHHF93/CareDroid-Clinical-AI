/**
 * Tool Orchestrator Controller
 * 
 * REST API endpoints for clinical tool execution
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ToolOrchestratorService } from './tool-orchestrator.service';
import { ExecuteToolDto, ToolExecutionResponseDto, ToolListDto } from './dto/tool-execution.dto';

@Controller('tools')
@UseGuards(AuthGuard('jwt'))
export class ToolOrchestratorController {
  constructor(private readonly toolOrchestratorService: ToolOrchestratorService) {}

  /**
   * GET /tools
   * List all available clinical tools
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  listTools(): ToolListDto {
    return this.toolOrchestratorService.listAvailableTools();
  }

  /**
   * GET /tools/available
   * Get tools available for user's current subscription tier
   */
  @Get('available')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  getAvailableTools(@Request() req: any): ToolListDto {
    const tier = req.user?.subscriptionTier || 'free';
    return this.toolOrchestratorService.getToolsBySubscriptionTier(tier);
  }

  /**
   * GET /tools/statistics
   * Get tool usage statistics
   */
  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  getStatistics() {
    return this.toolOrchestratorService.getToolStatistics();
  }

  /**
   * GET /tools/catalog/executors
   * Registered POST executors, contracts, and documented unsupported NLU tools.
   */
  @Get('catalog/executors')
  @HttpCode(HttpStatus.OK)
  getExecutorCatalog() {
    return this.toolOrchestratorService.getExecutorCatalog();
  }

  /**
   * GET /tools/:id
   * Get metadata for a specific tool
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getToolMetadata(@Param('id') toolId: string) {
    return this.toolOrchestratorService.getToolMetadata(toolId);
  }

  /**
   * POST /tools/:id/validate
   * Validate parameters for tool execution
   */
  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  async validateTool(
    @Param('id') toolId: string,
    @Body() body: { parameters?: Record<string, any> },
  ) {
    return this.toolOrchestratorService.validateToolExecution({
      toolId,
      parameters: body?.parameters ?? {},
      userId: 'system',
      conversationId: 'validation',
    });
  }

  /**
   * POST /tools/:id/execute
   * Execute a clinical tool
   */
  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  async executeTool(
    @Param('id') toolId: string,
    @Body() body: { parameters?: Record<string, any>; conversationId?: string },
    @Request() req: any,
  ): Promise<ToolExecutionResponseDto> {
    const dto: ExecuteToolDto = {
      toolId,
      parameters: body?.parameters ?? {},
      userId: req.user?.id || 'anonymous',
      conversationId: body.conversationId || 'direct-execution',
    };

    return this.toolOrchestratorService.executeTool(dto);
  }

  /**
   * POST /tools/execute
   * Execute any tool (alternative endpoint)
   */
  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeToolGeneric(
    @Body() dto: ExecuteToolDto,
    @Request() req: any,
  ): Promise<ToolExecutionResponseDto> {
    // Override userId with authenticated user
    dto.userId = req.user?.id || dto.userId || 'anonymous';
    return this.toolOrchestratorService.executeTool(dto);
  }

  /**
   * POST /tools/results
   * Persist tool results from offline sync
   */
  @Post('results')
  @HttpCode(HttpStatus.OK)
  async recordToolResult(
    @Body() body: { toolType: string; input?: any; output?: any; timestamp?: string },
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'anonymous';

    const result = await this.toolOrchestratorService.saveToolResult({
      userId,
      toolType: body.toolType,
      input: body.input,
      output: body.output,
      timestamp: body.timestamp,
    });

    return { status: 'recorded', id: result.id };
  }
}
