import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  FederatedLearningService,
  HybridDigitalTwinService,
  RealTimeSimulationService,
} from './emergency-os.advanced-services';
import { EmergencyOsUpgradeHarnessService } from './emergency-os.upgrade-harness.service';
import {
  BoardingService,
  CareDroidCentralNodeService,
  CapacityService,
  CompleteImplementationReadinessService,
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
  WorkflowActionLogService,
} from './emergency-os.services';
import type { EmergencyOsSettingsPatch, EmergencyPatient } from './emergency-os.types';

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
    private readonly workflowActionLogService: WorkflowActionLogService,
    private readonly implementationReadinessService: CompleteImplementationReadinessService,
    private readonly realTimeSimulationService: RealTimeSimulationService,
    private readonly federatedLearningService: FederatedLearningService,
    private readonly hybridDigitalTwinService: HybridDigitalTwinService,
    private readonly upgradeHarnessService: EmergencyOsUpgradeHarnessService,
    private readonly centralNodeService: CareDroidCentralNodeService,
  ) {}

  @Get('whiteboard')
  getWhiteboard() {
    return this.whiteboardService.getWhiteboard();
  }

  @Get('central-node/snapshot')
  getCentralNodeSnapshot() {
    return this.centralNodeService.getSnapshot();
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

  @Get('workflow-logs')
  getWorkflowLogs() {
    return this.workflowActionLogService.getEnvelope();
  }

  @Get('implementation-readiness')
  getImplementationReadiness() {
    return this.implementationReadinessService.getReadiness();
  }

  @Get('patients/:patientId/workflow-logs')
  getPatientWorkflowLogs(@Param('patientId') patientId: string) {
    return this.workflowActionLogService.getEnvelope(patientId);
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

  @Post('intake/vertical-slice')
  createSmartIntakeVerticalSlice(
    @Body()
    dto: Partial<EmergencyPatient> & { patient?: Partial<EmergencyPatient>; staffId?: string },
  ) {
    const slice = this.smartIntakeService.createVerticalSlice({
      ...(dto.patient || dto),
      staffId: dto.staffId,
    });
    const whiteboard = this.whiteboardService.getWhiteboard().data;
    const queueMetrics = this.queueService.getQueues().data;
    const reassessment = this.reassessmentService.getReassessmentQueue().data;
    const capacity = this.capacityService.getCapacity().data;

    return {
      module: 'Smart Intake Vertical Slice',
      generatedAt: new Date().toISOString(),
      source: 'backend-fixture',
      status: 'active',
      data: {
        ...slice,
        whiteboard,
        queueMetrics,
        reassessment,
        capacity,
        validation: {
          patientCreated: whiteboard.patients.some((patient) => patient.id === slice.patient.id),
          encounterCreated: slice.encounter.patientId === slice.patient.id,
          movedToArrival: slice.transitions.some((event) => event.to === 'Arrival'),
          movedToTriage: slice.patient.state === 'Triage',
          visibleOnWhiteboard: whiteboard.patients.some(
            (patient) => patient.id === slice.patient.id,
          ),
          visibleInQueueMetrics: queueMetrics.queues.some((queue) =>
            queue.patients.some((patient) => patient.id === slice.patient.id),
          ),
          reassessmentTriggered: slice.reassessmentTriggered,
          visibleInReassessment: reassessment.patients.some(
            (patient) => patient.id === slice.patient.id,
          ),
          capacityUpdated: Boolean(capacity.capacity.updatedAt),
        },
      },
    };
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

  @Get('upgrade-harness')
  getUpgradeHarness() {
    return this.upgradeHarnessService.getHarness();
  }

  @Get('upgrade-harness/capacity')
  getUpgradeHarnessCapacity() {
    return this.upgradeHarnessService.getCapacityAndForecasting();
  }

  @Get('upgrade-harness/patient-flow')
  getUpgradeHarnessPatientFlow() {
    return this.upgradeHarnessService.getPatientFlow();
  }

  @Get('upgrade-harness/patient-flow/:patientId')
  getUpgradeHarnessPatientFlowForPatient(@Param('patientId') patientId: string) {
    return this.upgradeHarnessService.getPatientFlow(patientId);
  }

  @Get('upgrade-harness/clinical-intelligence')
  getUpgradeHarnessClinicalIntelligence() {
    return this.upgradeHarnessService.getClinicalDecisionSupport();
  }

  @Get('upgrade-harness/clinical-intelligence/:patientId')
  getUpgradeHarnessClinicalIntelligenceForPatient(@Param('patientId') patientId: string) {
    return this.upgradeHarnessService.getClinicalDecisionSupport(patientId);
  }

  @Get('upgrade-harness/audit-summary')
  getUpgradeHarnessAuditSummary() {
    return this.upgradeHarnessService.getAuditSummary();
  }

  @Get('settings')
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: EmergencyOsSettingsPatch) {
    return this.settingsService.updateSettings(dto);
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
