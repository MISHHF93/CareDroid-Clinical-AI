import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformSystemsService } from './platform-systems.service';

/**
 * Clinical-intelligence AI demos and clinical-documentation drafting -- split
 * out from PlatformSystemsController (following the same module-boundary pass
 * that produced GovernanceController): every route here dispatches through
 * the same PlatformSystemsService.demo() capability-contract path and shares
 * no dependency on the clinical-operations services (patients/staff/EMS/
 * referrals/integrations) the parent controller still owns. Route paths,
 * guards, and permissions are unchanged; this is a pure organizational split,
 * not a behavior change.
 */
@ApiTags('clinical-intelligence')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class ClinicalIntelligenceController {
  constructor(private readonly platformSystemsService: PlatformSystemsService) {}

  @Post('clinical-intelligence/calculator-recommender/suggest')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  suggestCalculator(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('calculator-recommender-ai', 'demo-patient', body);
  }

  @Post('clinical-intelligence/workflow-builder/generate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  generateWorkflow(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('workflow-builder-ai', 'demo-patient', body);
  }

  @Post('clinical-intelligence/reasoning/analyze')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  analyzeReasoning(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('clinical-reasoning-engine', 'demo-patient', body);
  }

  @Post('clinical-intelligence/why-engine/explain')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  explainWhy(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('why-engine', 'demo-patient', body);
  }

  @Post('clinical-intelligence/audit-trail/summarize')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS, Permission.USE_AI_CHAT)
  summarizeAuditTrail(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('audit-trail-ai', 'demo-patient', body);
  }

  @Post('clinical-intelligence/clinical-event-ai/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftClinicalEvent(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('clinical-event-ai', 'demo-patient', body);
  }

  @Post('documentation/soap/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftSoap(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('soap-builder', 'demo-patient', body);
  }

  @Post('documentation/dictation/transcribe')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  transcribeDictation(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('clinical-dictation', 'demo-patient', body);
  }

  @Post('documentation/discharge-summary/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftDischargeSummary(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('discharge-summary-ai', 'demo-patient', body);
  }

  @Post('documentation/referral/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftReferral(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('referral-ai', 'demo-patient', body);
  }

  @Post('documentation/prior-auth/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftPriorAuth(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('prior-auth-ai', 'demo-patient', body);
  }

  @Post('documentation/:documentId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  approveDocument(@Param('documentId') documentId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('soap-builder', documentId, body);
  }

  @Post('documentation/:documentId/export')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.EXPORT_PHI)
  exportDocument(@Param('documentId') documentId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('soap-builder', documentId, body);
  }
}
