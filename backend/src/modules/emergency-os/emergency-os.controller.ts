import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  FederatedLearningService,
  HybridDigitalTwinService,
  RealTimeSimulationService,
} from './emergency-os.advanced-services';
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
    private readonly realTimeSimulationService: RealTimeSimulationService,
    private readonly federatedLearningService: FederatedLearningService,
    private readonly hybridDigitalTwinService: HybridDigitalTwinService,
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

  @Post('simulation/update-live')
  updateLiveSimulation(@Body() dto: any): any {
    return this.realTimeSimulationService.updateLiveState(dto);
  }

  @Post('simulation/evaluate')
  evaluateSimulation(@Body() dto: any): any {
    return this.realTimeSimulationService.evaluateIntervention(dto);
  }

  @Post('simulation/compare')
  compareSimulation(@Body() dto: any): any {
    return this.realTimeSimulationService.compareInterventions(dto);
  }

  @Get('simulation/recommendations')
  getSimulationRecommendations(): any {
    return this.realTimeSimulationService.getRecommendations();
  }

  @Post('federated-learning/register')
  registerFederatedHospital(@Body() dto: any): any {
    return this.federatedLearningService.registerHospital(dto);
  }

  @Post('federated-learning/update')
  updateFederatedModel(@Body() dto: any): any {
    return this.federatedLearningService.receiveLocalUpdate(dto);
  }

  @Post('federated-learning/aggregate')
  aggregateFederatedRound(): any {
    return this.federatedLearningService.aggregateRound();
  }

  @Get('federated-learning/global-model/:hospitalId')
  getFederatedGlobalModel(@Param('hospitalId') hospitalId: string): any {
    return this.federatedLearningService.getGlobalModel(hospitalId);
  }

  @Get('federated-learning/dashboard')
  getFederatedDashboard(): any {
    return this.federatedLearningService.getDashboard();
  }

  @Post('digital-twin/initialize')
  initializeDigitalTwin(@Body() dto: any): any {
    return this.hybridDigitalTwinService.initialize(dto);
  }

  @Post('digital-twin/simulate')
  simulateDigitalTwin(@Body() dto: any): any {
    return this.hybridDigitalTwinService.simulate(dto);
  }

  @Get('digital-twin/state')
  getDigitalTwinState(): any {
    return this.hybridDigitalTwinService.getState();
  }

  @Post('digital-twin/scenario')
  evaluateDigitalTwinScenario(@Body() dto: any): any {
    return this.hybridDigitalTwinService.evaluateScenario(dto);
  }
}
