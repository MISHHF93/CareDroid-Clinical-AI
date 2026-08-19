import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceService } from './platform-governance.service';
import {
  EvaluateGateDto,
  CreateReviewItemDto,
  GovernanceDecisionDto,
  ConsentActionDto,
  PrivacyRequestDto,
  CreateValidationScenarioDto,
} from './dto/governance-actions.dto';

@ApiTags('platform-governance')
@ApiBearerAuth()
@Controller('platform-governance')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class PlatformGovernanceController {
  constructor(private readonly platformGovernanceService: PlatformGovernanceService) {}

  @Get('summary')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getSummary() {
    return this.platformGovernanceService.getSummary();
  }

  @Post('gate/evaluate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.USE_AI_CHAT)
  evaluateGate(@Body() body: EvaluateGateDto, @Req() req: any) {
    return this.platformGovernanceService.evaluateGate({
      runId: body.runId,
      capabilityId: body.capabilityId || 'clinical-chat',
      patientId: body.patientId,
      phiAccessed: Boolean(body.phiAccessed),
      prompt: body.prompt,
      action: body.action,
      userId: req.user?.id || req.user?.userId || req.user?.sub,
      tenantId: req.tenantContext?.organizationId,
      workspaceId: req.tenantContext?.workspaceId,
    });
  }

  @Get('security/events')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  getSecuritySummary() {
    return this.platformGovernanceService.recordSecurityEvent({
      capabilityId: 'ai-security',
      eventType: 'ai.security.summary_viewed',
      severity: 'info',
      action: 'view',
    });
  }

  @Get('review/items')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  getReviewItems(@Req() req: any) {
    return this.platformGovernanceService.listReviewItems(req.tenantContext?.organizationId);
  }

  @Post('review/items')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.REVIEW_GOVERNANCE)
  createReviewItem(@Body() body: CreateReviewItemDto, @Req() req: any) {
    // HEAL-347.22: every sibling route on this controller (getReviewItems,
    // decideReviewItem) derives organizationId from req.tenantContext -- this
    // one instead trusted CreateReviewItemDto's own optional, client-settable
    // organizationId field verbatim into the saved entity. Any REVIEW_GOVERNANCE
    // holder could stamp a governance/clinical-AI-safety review item with
    // another org's id (polluting that org's compliance queue) or omit it
    // entirely (item becomes invisible to listReviewItems' org-scoped read).
    return this.platformGovernanceService.createReviewItem({
      ...body,
      organizationId: req.tenantContext?.organizationId,
    });
  }

  @Post('review/items/:itemId/decision')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.REVIEW_GOVERNANCE)
  decideReviewItem(
    @Param('itemId') itemId: string,
    @Body() body: GovernanceDecisionDto,
    @Req() req: any,
  ) {
    return this.platformGovernanceService.decideReviewItem(
      itemId,
      { ...body },
      req.tenantContext?.organizationId,
    );
  }

  @Get('consent/:patientId')
  @Permissions(Permission.MANAGE_CONSENT)
  getConsent(@Param('patientId') patientId: string, @Req() req: any) {
    return this.platformGovernanceService.getConsent(patientId, req.tenantContext?.organizationId);
  }

  @Post('consent/:patientId/:scope')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_CONSENT)
  upsertConsent(
    @Param('patientId') patientId: string,
    @Param('scope') scope: string,
    @Body() body: ConsentActionDto,
    @Req() req: any,
  ) {
    return this.platformGovernanceService.upsertConsent(
      patientId,
      scope,
      { ...body },
      req.tenantContext?.organizationId,
    );
  }

  @Post('privacy/:patientId/:requestType')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY)
  createPrivacyRequest(
    @Param('patientId') patientId: string,
    @Param('requestType') requestType: string,
    @Body() body: PrivacyRequestDto,
    @Req() req: any,
  ) {
    return this.platformGovernanceService.createPrivacyRequest(
      patientId,
      requestType,
      { ...body },
      req.tenantContext?.organizationId,
    );
  }

  @Get('source-provenance/:sourceId')
  @Permissions(Permission.CONFIGURE_SYSTEM)
  getSourceProvenance(@Param('sourceId') sourceId: string) {
    return this.platformGovernanceService.getSourceProvenance(sourceId);
  }

  @Get('synthetic/fhir')
  @Permissions(Permission.CONFIGURE_SYSTEM)
  getSyntheticFhir() {
    return this.platformGovernanceService.syntheticFhirBundle();
  }

  @Get('synthetic/hl7')
  @Permissions(Permission.CONFIGURE_SYSTEM)
  getSyntheticHl7() {
    return this.platformGovernanceService.syntheticHl7Message();
  }

  @Get('validation/scenarios')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getValidationScenarios() {
    return this.platformGovernanceService.listValidationScenarios();
  }

  @Post('validation/scenarios')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  createValidationScenario(@Body() body: CreateValidationScenarioDto) {
    return this.platformGovernanceService.createValidationScenario({ ...body });
  }

  @Get('observability')
  @Permissions(Permission.VIEW_ANALYTICS)
  getObservability(@Req() req: any) {
    return this.platformGovernanceService.recentObservability(req.tenantContext?.organizationId);
  }
}
