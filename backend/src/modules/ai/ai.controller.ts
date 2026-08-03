import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Query,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AIService } from './ai.service';
import { AIQueryDto, CareDroidAINodeDto, StructuredJSONDto, UnifiedAiQueryDto } from './dto/ai.dto';
import { AiActionProposalService, type AiActionProposalState } from './ai-action-proposal.service';
import {
  CreateAiActionProposalDto,
  ExecuteAiActionProposalDto,
  RejectAiActionProposalDto,
} from './dto/ai-action-proposal-actions.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { Permission } from '../auth/enums/permission.enum';
import { TenantIsolationGuard } from '../tenant-context/tenant-isolation.guard';
import {
  OrganizationScoped,
  TenantScoped,
  WorkspaceScoped,
} from '../tenant-context/tenant-scope.decorator';
import { EntitlementService } from '../platform-assets/entitlement.service';

const withTenantContext = (context: any, tenantContext: any) => ({
  ...(context || {}),
  tenant: tenantContext
    ? {
        organizationId: tenantContext.organizationId,
        workspaceId: tenantContext.workspaceId,
        userId: tenantContext.userId,
        role: tenantContext.role,
        subscriptionPlan: tenantContext.subscriptionPlan,
        source: tenantContext.source,
      }
    : context?.tenant,
});

/**
 * Clinical AI HTTP entry points (POST /ai/query, /ai/structured) must match the
 * gateway fail-safe: requiresHumanReview defaults true. AIService only enables
 * review when context.aiFoundation.requiresHumanReview is set (see Cycle 230).
 */
const withClinicalHumanReview = (context: any) => ({
  ...(context || {}),
  aiFoundation: {
    ...((context && context.aiFoundation) || {}),
    requiresHumanReview: true,
  },
});

@ApiTags('ai')
@Controller('ai')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
@TenantScoped()
@ApiBearerAuth()
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly organizationsService: OrganizationsService,
    private readonly entitlementService: EntitlementService,
    private readonly actionProposals: AiActionProposalService,
  ) {}

  @Post('query')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'Query GPT-4 for clinical assistance' })
  @ApiResponse({ status: 200, description: 'AI response generated' })
  async query(@Req() req: any, @Body() dto: AIQueryDto) {
    await this.assertAiFeatureAllowed(req, dto.context);
    return this.aiService.invokeLLM(
      req.user.id,
      dto.prompt,
      withTenantContext(withClinicalHumanReview(dto.context), req.tenantContext),
    );
  }

  @Post('structured')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'Generate structured JSON clinical output' })
  @ApiResponse({ status: 200, description: 'Structured JSON generated' })
  async generateStructured(@Req() req: any, @Body() dto: StructuredJSONDto) {
    await this.assertAiFeatureAllowed(req, undefined);
    return this.aiService.generateStructuredJSON(
      req.user.id,
      dto.prompt,
      dto.schema,
      withTenantContext(withClinicalHumanReview(undefined), req.tenantContext),
    );
  }

  @Post('node')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'Run centralized CareDroid AI workflow intent' })
  @ApiResponse({ status: 200, description: 'Structured CareDroid AI node response generated' })
  async runCareDroidNode(@Req() req: any, @Body() dto: CareDroidAINodeDto) {
    const context = withTenantContext(dto.context, req.tenantContext);
    await this.assertAiFeatureAllowed(req, {
      ...context,
      assetId: context?.assetId || 'agent-clinical',
    });
    return this.aiService.runCareDroidAINode(
      req.user.id,
      {
        intent: dto.intent as any,
        input: dto.input,
        context,
      },
      context,
    );
  }

  @Post('unified')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({
    summary: 'Canonical CareDroid Unified AI Node query (validated envelope)',
  })
  @ApiResponse({ status: 200, description: 'Unified AI response envelope' })
  async runUnifiedQuery(@Req() req: any, @Body() dto: UnifiedAiQueryDto) {
    await this.assertAiFeatureAllowed(req, {
      assetId: 'agent-clinical',
      channel: dto.channel,
      task: dto.task,
    });
    return this.aiService.runUnifiedAiQuery(
      req.user.id,
      dto as unknown as Record<string, unknown>,
      {
        organizationId: req.tenantContext?.organizationId,
        workspaceId: req.tenantContext?.workspaceId,
        role: req.tenantContext?.role || dto.role,
        subscriptionPlan: req.tenantContext?.subscriptionPlan,
      },
    );
  }

  @Post('proposals')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'Create an AI action proposal (preview before execute)' })
  async createProposal(@Req() req: any, @Body() body: CreateAiActionProposalDto) {
    await this.assertAiFeatureAllowed(req, { assetId: 'agent-clinical' });
    return this.actionProposals.create({
      organizationId: req.tenantContext?.organizationId || (body.organizationId as string),
      originatingRequestId: String(body.originatingRequestId || body.requestId || 'unknown'),
      correlationId: String(body.correlationId || body.originatingRequestId || 'unknown'),
      sessionId: body.sessionId ? String(body.sessionId) : undefined,
      patientId: body.patientId ? String(body.patientId) : undefined,
      toolName: String(body.toolName || 'unknown_tool'),
      validatedArguments:
        body.validatedArguments && typeof body.validatedArguments === 'object'
          ? (body.validatedArguments as Record<string, unknown>)
          : {},
      expectedEffect: String(body.expectedEffect || 'No effect described'),
      riskLevel: (body.riskLevel as any) || 'moderate',
      requiredPermission: body.requiredPermission ? String(body.requiredPermission) : 'use_ai_chat',
      requiresApproval:
        typeof body.requiresApproval === 'boolean' ? body.requiresApproval : undefined,
      previewSummary: String(body.previewSummary || body.expectedEffect || 'Preview required'),
      dataWillChange: Array.isArray(body.dataWillChange) ? body.dataWillChange.map(String) : [],
      model: body.model ? String(body.model) : undefined,
      promptVersion: body.promptVersion ? String(body.promptVersion) : undefined,
      rollbackCapable: Boolean(body.rollbackCapable),
      reversibleWindowMs:
        typeof body.reversibleWindowMs === 'number' ? body.reversibleWindowMs : 15 * 60 * 1000,
      ownerUserId: req.user?.id,
      ownerRole: req.tenantContext?.role || (body.ownerRole as string),
    });
  }

  @Get('proposals')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'List AI action proposals for the active tenant/user' })
  async listProposals(
    @Req() req: any,
    @Query('state') state?: string,
    @Query('mine') mine?: string,
  ) {
    return {
      items: this.actionProposals.list({
        organizationId: req.tenantContext?.organizationId,
        ownerUserId: mine === '1' || mine === 'true' ? req.user?.id : undefined,
        state: state as AiActionProposalState | undefined,
      }),
    };
  }

  @Get('proposals/:proposalId')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'Get one AI action proposal' })
  async getProposal(@Param('proposalId') proposalId: string) {
    return this.actionProposals.get(proposalId);
  }

  @Get('proposals/:proposalId/audit')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({
    summary:
      'Hash-chained transition audit trail for one AI action proposal, with tamper verification',
  })
  async getProposalAudit(@Param('proposalId') proposalId: string) {
    // 404s the same way getProposal does if the proposal itself doesn't exist.
    this.actionProposals.get(proposalId);
    return {
      trail: this.actionProposals.getAuditTrail(proposalId),
      verification: this.actionProposals.verifyAuditChain(proposalId),
    };
  }

  @Post('proposals/:proposalId/approve')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'Approve an AI action proposal' })
  async approveProposal(@Req() req: any, @Param('proposalId') proposalId: string) {
    return this.actionProposals.approve(proposalId, req.user?.id);
  }

  @Post('proposals/:proposalId/reject')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'Reject an AI action proposal' })
  async rejectProposal(
    @Param('proposalId') proposalId: string,
    @Body() body: RejectAiActionProposalDto,
  ) {
    return this.actionProposals.reject(
      proposalId,
      String(body.reason || body.rejectionReason || 'Rejected by user'),
    );
  }

  @Post('proposals/:proposalId/execute')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({
    summary:
      'Execute an approved AI action proposal (records draft outcome; no silent chart writes)',
  })
  async executeProposal(
    @Param('proposalId') proposalId: string,
    @Body() body: ExecuteAiActionProposalDto,
  ) {
    return this.actionProposals.execute(
      proposalId,
      body.result && typeof body.result === 'object'
        ? (body.result as Record<string, unknown>)
        : undefined,
    );
  }

  @Post('proposals/:proposalId/rollback')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'Rollback a completed reversible proposal within the window' })
  async rollbackProposal(@Param('proposalId') proposalId: string) {
    return this.actionProposals.transition(proposalId, 'rolled_back');
  }

  @Get('usage')
  @TenantScoped()
  @ApiOperation({ summary: 'Get AI usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  async getUsage(@Req() req: any, @Query('days') days?: number) {
    return this.aiService.getUsage(req.user.id, days ? parseInt(days.toString(), 10) : 30);
  }

  @Get('organizations/:organizationId/usage')
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.VIEW_ANALYTICS] })
  @ApiOperation({ summary: 'Get organization AI usage by asset, agent, and model class' })
  @ApiResponse({ status: 200, description: 'Organization AI usage summary' })
  async getOrganizationUsage(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Query('days') days?: number,
  ) {
    if (req.tenantContext?.organizationId && req.tenantContext.organizationId !== organizationId) {
      throw new ForbiddenException('Requested organization does not match tenant context.');
    }
    await this.organizationsService.assertMemberForUser(req.user.id, organizationId);
    return this.aiService.getOrganizationUsageSummary(
      organizationId,
      days ? parseInt(days.toString(), 10) : 30,
    );
  }

  @Get('remaining-queries')
  @TenantScoped()
  @ApiOperation({ summary: 'Get remaining AI queries for current subscription tier' })
  @ApiResponse({ status: 200, description: 'Remaining queries count' })
  async getRemainingQueries(@Req() req: any) {
    return this.aiService.getRemainingQueries(req.user.id);
  }

  @Get('providers/health')
  @TenantScoped()
  @ApiOperation({ summary: 'List AI provider adapter health (configured/ok, no secrets)' })
  @ApiResponse({ status: 200, description: 'Provider health snapshot' })
  async getProvidersHealth() {
    return this.aiService.getProvidersHealth();
  }

  @Get('models')
  @TenantScoped()
  @ApiOperation({ summary: 'List registered AI models from the model registry' })
  @ApiResponse({ status: 200, description: 'Model registry entries' })
  async getModels() {
    return this.aiService.getRegisteredModels();
  }

  @Get('tools')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'List AI tool definitions available to the unified AI node' })
  @ApiResponse({ status: 200, description: 'Tool catalog' })
  async getTools() {
    return this.aiService.getAiToolCatalog();
  }

  @Get('requests/:requestId')
  @WorkspaceScoped({ permissions: [Permission.USE_AI_CHAT] })
  @ApiOperation({ summary: 'Fetch a prior AI request record by id (tenant-scoped, redacted)' })
  @ApiResponse({ status: 200, description: 'AI request record' })
  async getRequest(@Req() req: any, @Param('requestId') requestId: string) {
    return this.aiService.getRequestById(req.user.id, requestId, req.tenantContext);
  }

  private async assertAiFeatureAllowed(req: any, context: any) {
    const assetId =
      context?.assetId || context?.agentId || context?.toolId || context?.tool || 'agent-clinical';
    await this.entitlementService.assertLaunchAllowed({
      assetId,
      organizationId: req.tenantContext?.organizationId,
      workspaceId: req.tenantContext?.workspaceId,
      userId: req.user?.id || req.user?.userId || req.user?.sub,
      userRole: req.tenantContext?.role || req.user?.role,
      subscriptionPlan: req.tenantContext?.subscriptionPlan || req.user?.subscription?.tier,
      strictEntitlements: true,
    });
  }
}
