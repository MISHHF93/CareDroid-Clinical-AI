import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';
import { PlatformSystemsModule } from '../platform-systems/platform-systems.module';
import { PlatformSystemsService } from '../platform-systems/platform-systems.service';

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
      provenance: await this.platformGovernance.getSourceProvenance('synthetic-source'),
      uiStates: { loading: false, error: null, connectionState: 'demo_unconfigured' },
    };
  }
}

@Module({
  imports: [PlatformSystemsModule, PlatformGovernanceModule],
  controllers: [InteroperabilityController],
  providers: [
    FHIRService,
    HL7BridgeService,
    PatientImportService,
    ObservationImportService,
    MedicationImportService,
  ],
  exports: [
    FHIRService,
    HL7BridgeService,
    PatientImportService,
    ObservationImportService,
    MedicationImportService,
  ],
})
export class InteroperabilityModule {}
