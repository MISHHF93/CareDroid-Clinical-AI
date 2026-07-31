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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformSystemsService } from './platform-systems.service';
import { PlatformGovernanceService } from '../platform-governance';
import {
  EhrPatientImportDto,
  ImportLabsDto,
  ImportMedicationsDto,
  ImportObservationsDto,
  CreatePatientEventDto,
  AddRiskScoreDto,
} from './dto/patient-clinical-data-actions.dto';

/**
 * Per-patient clinical data operations (EHR/labs/medications/observations
 * import, workspace, source-data, summary, timeline, events, risk scores,
 * care plan) -- split out from PlatformSystemsController following the same
 * module-boundary pass that produced GovernanceController,
 * ClinicalIntelligenceController, and IntegrationsController: every route
 * here dispatches through PlatformSystemsService (optionally
 * PlatformGovernanceService for source data) and shares no dependency on the
 * patient/staff/EMS/referral CRUD services the parent controller still owns.
 * Route paths, guards, and permissions are unchanged; this is a pure
 * organizational split, not a behavior change.
 */
@ApiTags('patient-clinical-data')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class PatientClinicalDataController {
  constructor(
    private readonly platformSystemsService: PlatformSystemsService,
    @Optional() private readonly platformGovernanceService?: PlatformGovernanceService,
  ) {}

  @Post('patients/import/ehr')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.IMPORT_PATIENT_DATA)
  importEhrPatient(@Body() body: EhrPatientImportDto) {
    return this.platformSystemsService.demo('ehr-patient-import', 'demo-patient', { ...body });
  }

  @Post('patients/:patientId/import/labs')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importLabs(@Param('patientId') patientId: string, @Body() body: ImportLabsDto) {
    return this.platformSystemsService.demo('lab-result-import', patientId, { ...body });
  }

  @Post('patients/:patientId/import/medications')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importMedications(@Param('patientId') patientId: string, @Body() body: ImportMedicationsDto) {
    return this.platformSystemsService.demo('medication-list-import', patientId, { ...body });
  }

  @Post('patients/:patientId/import/observations')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importObservations(@Param('patientId') patientId: string, @Body() body: ImportObservationsDto) {
    return this.platformSystemsService.demo('observation-vitals-import', patientId, { ...body });
  }

  @Get('patients/:patientId/workspace')
  @Permissions(Permission.READ_PHI)
  getPatientWorkspace(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getPatientWorkspace(patientId);
  }

  @Get('patients/:patientId/source-data')
  @Permissions(Permission.READ_PHI)
  async getPatientSourceData(@Param('patientId') patientId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getPatientSourceData(patientId);
    }
    return this.platformSystemsService.getSourceProvenance(patientId);
  }

  @Get('patients/:patientId/summary')
  @Permissions(Permission.READ_PHI)
  getPatientSummaryShell(@Param('patientId') patientId: string) {
    return this.platformSystemsService.demo('patient-summary-ai', patientId);
  }

  @Get('patients/:patientId/timeline')
  @Permissions(Permission.READ_PHI)
  getTimeline(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getTimeline(patientId);
  }

  @Post('patients/:patientId/events')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  createPatientEvent(@Param('patientId') patientId: string, @Body() body: CreatePatientEventDto) {
    return this.platformSystemsService.demo('clinical-event-ai', patientId, { ...body });
  }

  @Get('patients/:patientId/risk-scores')
  @Permissions(Permission.READ_PHI)
  getRiskScores(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getRiskScores(patientId);
  }

  @Post('patients/:patientId/risk-scores')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  addRiskScore(@Param('patientId') patientId: string, @Body() body: AddRiskScoreDto) {
    return this.platformSystemsService.demo('risk-score-history', patientId, { ...body });
  }

  @Get('patients/:patientId/care-plan')
  @Permissions(Permission.READ_PHI)
  getCarePlan(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getCarePlan(patientId);
  }
}
