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
import { AIQueryDto, CareDroidAINodeDto, StructuredJSONDto } from './dto/ai.dto';
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
      withTenantContext(dto.context, req.tenantContext),
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
      withTenantContext(undefined, req.tenantContext),
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
