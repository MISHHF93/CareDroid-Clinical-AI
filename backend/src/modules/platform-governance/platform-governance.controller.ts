import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceService } from './platform-governance.service';

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
  evaluateGate(@Body() body: Record<string, any>) {
    return this.platformGovernanceService.evaluateGate({
      runId: body.runId,
      capabilityId: body.capabilityId || 'clinical-chat',
      patientId: body.patientId,
      phiAccessed: Boolean(body.phiAccessed),
      prompt: body.prompt,
      action: body.action,
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
  getReviewItems() {
    return this.platformGovernanceService.listReviewItems();
  }

  @Post('review/items')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  createReviewItem(@Body() body: Record<string, any>) {
    return this.platformGovernanceService.createReviewItem(body);
  }

  @Post('review/items/:itemId/decision')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  decideReviewItem(@Param('itemId') itemId: string, @Body() body: Record<string, any>) {
    return this.platformGovernanceService.decideReviewItem(itemId, body);
  }

  @Get('consent/:patientId')
  @Permissions(Permission.MANAGE_CONSENT)
  getConsent(@Param('patientId') patientId: string) {
    return this.platformGovernanceService.getConsent(patientId);
  }

  @Post('consent/:patientId/:scope')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_CONSENT)
  upsertConsent(
    @Param('patientId') patientId: string,
    @Param('scope') scope: string,
    @Body() body: Record<string, any>,
  ) {
    return this.platformGovernanceService.upsertConsent(patientId, scope, body);
  }

  @Post('privacy/:patientId/:requestType')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY)
  createPrivacyRequest(
    @Param('patientId') patientId: string,
    @Param('requestType') requestType: string,
    @Body() body: Record<string, any>,
  ) {
    return this.platformGovernanceService.createPrivacyRequest(patientId, requestType, body);
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
  createValidationScenario(@Body() body: Record<string, any>) {
    return this.platformGovernanceService.createValidationScenario(body);
  }

  @Get('observability')
  @Permissions(Permission.VIEW_ANALYTICS)
  getObservability() {
    return this.platformGovernanceService.recentObservability();
  }
}
