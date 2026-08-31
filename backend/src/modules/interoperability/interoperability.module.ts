import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { AuditModule } from '../audit/audit.module';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';
import { PlatformSystemsModule } from '../platform-systems/platform-systems.module';
import { PlatformSystemsService } from '../platform-systems/platform-systems.service';
import {
  IntegrationEventRecordEntity,
  IntegrationSourceEntity,
  NormalizedIntegrationEventEntity,
} from './entities/integration-hub.entity';
import { IntegrationAutomationRouter } from './integration-automation-router.service';
import { IntegrationEventRegistry } from './integration-event-registry.service';
import { IntegrationHubIngestRequest, IntegrationHubService } from './integration-hub.service';
import { TerminologyService } from './terminology.service';

@Injectable()
export class FHIRService {
  constructor(private readonly platformSystems: PlatformSystemsService) {}
  getConnections() {
    return this.platformSystems.getFhirConnections();
  }
}

@Injectable()
export class HL7BridgeService {
  constructor(private readonly platformSystems: PlatformSystemsService) {}
  getInterfaces() {
    return this.platformSystems.getHl7Interfaces();
  }
}

@Injectable()
export class PatientImportService {
  getPanel() {
    return { status: 'preview_required', writebackAllowed: false };
  }
}

@Injectable()
export class ObservationImportService {
  getPanel() {
    return { observations: [], state: 'ready_for_preview' };
  }
}

@Injectable()
export class MedicationImportService {
  getPanel() {
    return { medications: [], state: 'ready_for_preview' };
  }
}

@Controller('interoperability')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class InteroperabilityController {
  constructor(
    private readonly fhir: FHIRService,
    private readonly hl7: HL7BridgeService,
    private readonly patientImport: PatientImportService,
    private readonly observationImport: ObservationImportService,
    private readonly medicationImport: MedicationImportService,
    private readonly platformGovernance: PlatformGovernanceService,
    private readonly integrationEventRegistry: IntegrationEventRegistry,
    private readonly integrationHub: IntegrationHubService,
  ) {}

  @Get('summary')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  async getSummary() {
    return {
      status: 'synthetic_ready',
      panels: {
        patientImport: this.patientImport.getPanel(),
        observations: this.observationImport.getPanel(),
        medications: this.medicationImport.getPanel(),
        labs: { state: 'ready_for_preview', writebackAllowed: false },
        encounters: { state: 'ready_for_preview', writebackAllowed: false },
      },
      connections: {
        fhir: this.fhir.getConnections(),
        hl7: this.hl7.getInterfaces(),
      },
      automation: {
        model: 'Integration Event -> Normalized Event -> Automation Trigger -> Safe Action',
        safeActionPolicy: 'review_required_no_clinical_writeback',
        registeredEvents: this.integrationEventRegistry.listDefinitions(),
      },
      provenance: await this.platformGovernance.getSourceProvenance('synthetic-source'),
      uiStates: { loading: false, error: null, connectionState: 'demo_unconfigured' },
    };
  }

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  ingestEvent(@Body() body: IntegrationHubIngestRequest, @Req() req: any) {
    return this.integrationHub.ingest(body, {
      userId: req.user?.id || req.user?.userId,
      organizationId: req.tenantContext?.organizationId,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: String(req.headers?.['user-agent'] || 'unknown'),
    });
  }

  @Get('events')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  listEvents(@Query('limit') limit?: string, @Req() req?: any) {
    return this.integrationHub.listRecent(
      limit ? Number(limit) : undefined,
      req?.tenantContext?.organizationId,
    );
  }

  @Get('events/:id')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  getEventTrace(@Param('id') id: string, @Req() req: any) {
    return this.integrationHub.getTrace(id, req.tenantContext?.organizationId);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegrationSourceEntity,
      IntegrationEventRecordEntity,
      NormalizedIntegrationEventEntity,
    ]),
    PlatformSystemsModule,
    PlatformGovernanceModule,
    AuditModule,
  ],
  controllers: [InteroperabilityController],
  providers: [
    FHIRService,
    HL7BridgeService,
    PatientImportService,
    ObservationImportService,
    MedicationImportService,
    IntegrationEventRegistry,
    IntegrationAutomationRouter,
    IntegrationHubService,
    TerminologyService,
  ],
  exports: [
    FHIRService,
    HL7BridgeService,
    PatientImportService,
    ObservationImportService,
    MedicationImportService,
    IntegrationEventRegistry,
    IntegrationAutomationRouter,
    IntegrationHubService,
    TerminologyService,
  ],
})
export class InteroperabilityModule {}
