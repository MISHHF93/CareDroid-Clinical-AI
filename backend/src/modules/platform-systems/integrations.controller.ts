import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformSystemsService } from './platform-systems.service';
import { PlatformGovernanceService } from '../platform-governance';
import { TenantContext } from '../tenant-context/tenant-context.decorator';
import type { TenantContext as TenantContextValue } from '../tenant-context/tenant-context.types';
import {
  CreateFhirConnectionDto,
  TestFhirConnectionDto,
  SyncFhirConnectionDto,
  TestHl7MessageDto,
  PreviewHl7MessageReplayDto,
} from './dto/integrations-actions.dto';

/**
 * Platform capability contracts and external-system integrations (FHIR/HL7,
 * source provenance) -- split out from PlatformSystemsController following the
 * same module-boundary pass that produced GovernanceController and
 * ClinicalIntelligenceController: every route here dispatches through
 * PlatformSystemsService (optionally PlatformGovernanceService for source
 * provenance) and shares no dependency on the patient/staff/EMS/referral
 * services the parent controller still owns. Route paths, guards, and
 * permissions are unchanged; this is a pure organizational split, not a
 * behavior change.
 */
@ApiTags('integrations')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class IntegrationsController {
  constructor(
    private readonly platformSystemsService: PlatformSystemsService,
    @Optional() private readonly platformGovernanceService?: PlatformGovernanceService,
  ) {}

  @Get('platform-systems/capabilities/:capabilityId')
  @Permissions(Permission.USE_AI_CHAT)
  @ApiOperation({ summary: 'Get a platform capability contract and demo safety state' })
  getCapability(@Param('capabilityId') capabilityId: string) {
    return this.platformSystemsService.getCapability(capabilityId);
  }

  @Get('platform-systems/packs/:pack')
  @Permissions(Permission.USE_AI_CHAT)
  @ApiOperation({ summary: 'Get platform pack capability contracts' })
  getPack(@Param('pack') pack: string) {
    return this.platformSystemsService.getPack(pack);
  }

  @Get('integrations/fhir/connections')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  getFhirConnections() {
    return this.platformSystemsService.getFhirConnections();
  }

  @Post('integrations/fhir/connections')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  createFhirConnection(@Body() body: CreateFhirConnectionDto) {
    return this.platformSystemsService.demo('fhir-connector', 'demo-patient', { ...body });
  }

  @Post('integrations/fhir/:connectionId/test')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  testFhirConnection(
    @Param('connectionId') connectionId: string,
    @Body() body: TestFhirConnectionDto,
  ) {
    return this.platformSystemsService.demo('fhir-connector', connectionId, { ...body });
  }

  @Post('integrations/fhir/:connectionId/sync')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  syncFhirConnection(
    @Param('connectionId') connectionId: string,
    @Body() body: SyncFhirConnectionDto,
  ) {
    return this.platformSystemsService.demo('fhir-connector', connectionId, { ...body });
  }

  @Get('integrations/hl7/interfaces')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  getHl7Interfaces() {
    return this.platformSystemsService.getHl7Interfaces();
  }

  @Post('integrations/hl7/interfaces/:interfaceId/test-message')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  testHl7Message(@Param('interfaceId') interfaceId: string, @Body() body: TestHl7MessageDto) {
    return this.platformSystemsService.demo('hl7-bridge', interfaceId, { ...body });
  }

  @Get('integrations/hl7/messages/quarantine')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  getHl7MessageQuarantine() {
    return this.platformSystemsService.demo('hl7-bridge', 'quarantine');
  }

  @Post('integrations/hl7/messages/:messageId/replay-preview')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  previewHl7MessageReplay(
    @Param('messageId') messageId: string,
    @Body() body: PreviewHl7MessageReplayDto,
  ) {
    return this.platformSystemsService.demo('hl7-bridge', messageId, {
      ...body,
      replayMode: 'preview_only',
      writebackAllowed: false,
    });
  }

  @Get('source-provenance/:sourceId')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  async getSourceProvenance(
    @Param('sourceId') sourceId: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getSourceProvenance(
        sourceId,
        tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.getSourceProvenance(sourceId);
  }
}
