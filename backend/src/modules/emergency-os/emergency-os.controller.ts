import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  BoardingService,
  CapacityService,
  EDCopilotService,
  EMSIntakeService,
  EmergencyAnalyticsService,
  EmergencyPatientService,
  EmergencySettingsService,
  EmergencyWhiteboardService,
  IntegrationHubService,
  PatientJourneyService,
  ProvincialHealthService,
  QueueIntelligenceService,
  ReassessmentService,
  ReferralService,
  SmartIntakeService,
} from './emergency-os.services';
import type { EmergencyPatient } from './emergency-os.types';

@Controller('emergency')
export class EmergencyOsController {
  constructor(
    private readonly whiteboardService: EmergencyWhiteboardService,
    private readonly patientService: EmergencyPatientService,
    private readonly journeyService: PatientJourneyService,
    private readonly emsIntakeService: EMSIntakeService,
    private readonly smartIntakeService: SmartIntakeService,
    private readonly queueService: QueueIntelligenceService,
    private readonly reassessmentService: ReassessmentService,
    private readonly capacityService: CapacityService,
    private readonly boardingService: BoardingService,
    private readonly referralService: ReferralService,
    private readonly provincialHealthService: ProvincialHealthService,
    private readonly integrationHubService: IntegrationHubService,
    private readonly copilotService: EDCopilotService,
    private readonly analyticsService: EmergencyAnalyticsService,
    private readonly settingsService: EmergencySettingsService,
  ) {}

  @Get('whiteboard')
  getWhiteboard() {
    return this.whiteboardService.getWhiteboard();
  }

  @Get('patients')
  getPatients() {
    return this.patientService.getPatientEnvelope();
  }

  @Post('patients')
  createPatient(@Body() dto: Partial<EmergencyPatient>) {
    return this.smartIntakeService.createFromIntake(dto);
  }

  @Get('journey')
  getJourney() {
    return this.journeyService.getJourney();
  }

  @Get('ems')
  getEMS() {
    return this.emsIntakeService.getEMSIntake();
  }

  @Get('intake')
  getIntake() {
    return this.smartIntakeService.getSmartIntake();
  }

  @Post('intake')
  createIntakePatient(@Body() dto: Partial<EmergencyPatient>) {
    return this.smartIntakeService.createFromIntake(dto);
  }

  @Get('queues')
  getQueues() {
    return this.queueService.getQueues();
  }

  @Get('reassessment')
  getReassessment() {
    return this.reassessmentService.getReassessmentQueue();
  }

  @Get('capacity')
  getCapacity() {
    return this.capacityService.getCapacity();
  }

  @Get('boarding')
  getBoarding() {
    return this.boardingService.getBoarding();
  }

  @Get('referrals')
  getReferrals() {
    return this.referralService.getReferrals();
  }

  @Get('provincial-health')
  getProvincialHealth() {
    return this.provincialHealthService.getProvincialHealth();
  }

  @Get('integrations')
  getIntegrations() {
    return this.integrationHubService.getIntegrationHub();
  }

  @Get('copilot')
  getCopilot() {
    return this.copilotService.getCopilotContext();
  }

  @Get('analytics')
  getAnalytics() {
    return this.analyticsService.getAnalytics();
  }

  @Get('settings')
  getSettings() {
    return this.settingsService.getSettings();
  }
}
