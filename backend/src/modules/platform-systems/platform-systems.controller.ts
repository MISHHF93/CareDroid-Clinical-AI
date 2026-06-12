import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformSystemsService } from './platform-systems.service';
import { PlatformGovernanceService } from '../platform-governance';

@ApiTags('platform-systems')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class PlatformSystemsController {
  constructor(
    private readonly platformSystemsService: PlatformSystemsService,
    @Optional() private readonly platformGovernanceService?: PlatformGovernanceService,
  ) {}

  private emergencyPatients: Record<string, any>[] = [
    {
      id: 'pt-001',
      mrn: 'MRN-100001',
      firstName: 'Maya',
      lastName: 'Singh',
      dob: '1978-04-18',
      age: 48,
      sex: 'Female',
      arrivalTime: '2026-06-10T18:08:00-04:00',
      triageTime: null,
      lastAssessedTime: '2026-06-10T18:14:00-04:00',
      chiefComplaint: 'Chest pain',
      complaintCategory: 'Cardiac',
      state: 'Assessment',
      priority: 'P2',
      vitals: {
        hr: 104,
        bpSystolic: 148,
        bpDiastolic: 88,
        spo2: 97,
        temp: 36.8,
        rr: 20,
        gcs: 15,
        pain: 5,
        recordedAt: '2026-06-10T18:14:00-04:00',
      },
      assignedStaffId: 'staff-priya-nair',
      roomId: 'room-assessment-1',
      flags: [
        {
          type: 'HighRisk',
          reason: 'High priority chest pain under assessment.',
          detectedAt: '2026-06-10T18:10:00-04:00',
          severity: 'Warning',
        },
      ],
      timeline: [
        {
          id: 'event-pt-001-arrival',
          patientId: 'pt-001',
          type: 'Arrival',
          timestamp: '2026-06-10T18:08:00-04:00',
          summary: 'Arrived with exertional chest pain.',
        },
      ],
      notes: [],
    },
  ];

  private emergencyStaff: Record<string, any>[] = [
    {
      id: 'staff-priya-nair',
      firstName: 'Priya',
      lastName: 'Nair',
      role: 'Attending',
      status: 'OnShift',
      shiftId: 'shift-evening-2026-06-10',
      assignedPatientIds: ['pt-001'],
      currentRoomId: 'room-assessment-1',
    },
  ];

  private emergencyRooms: Record<string, any>[] = [
    {
      id: 'room-assessment-1',
      name: 'Assessment 1',
      type: 'Assessment',
      status: 'Occupied',
      currentPatientId: 'pt-001',
      isIsolationCapable: false,
    },
    {
      id: 'room-resus-1',
      name: 'Resus 1',
      type: 'Resuscitation',
      status: 'Available',
      currentPatientId: null,
      isIsolationCapable: true,
    },
  ];

  private emergencyShift: Record<string, any> = {
    id: 'shift-evening-2026-06-10',
    name: 'Evening ED Shift',
    startTime: '2026-06-10T15:00:00-04:00',
    endTime: '2026-06-10T23:00:00-04:00',
    status: 'Active',
    chargeStaffId: 'staff-priya-nair',
    staffIds: ['staff-priya-nair'],
    handoffNotes: [],
  };

  private emergencyEmsUnits: Record<string, any>[] = [
    {
      id: 'ems-unit-22',
      callSign: 'TPS Medic 22',
      agency: 'Toronto Paramedic Services',
      status: 'Inbound',
      crewStaffIds: [],
      activeArrivalId: 'ems-arrival-001',
      lastKnownLocation: 'Bay Street',
    },
  ];

  private emergencyEmsArrivals: Record<string, any>[] = [
    {
      id: 'ems-arrival-001',
      unitId: 'ems-unit-22',
      unitName: 'TPS Medic 22',
      crewNames: ['A. Gomez', 'L. Patel'],
      patientAge: 68,
      patientSex: 'Male',
      chiefComplaint: 'Shortness of breath',
      eta: 7,
      severity: 'High',
      dispatchTime: '2026-06-10T18:04:00-04:00',
      estimatedArrivalTime: '2026-06-10T18:18:00-04:00',
      notes: 'COPD history, oxygen started en route.',
      status: 'Inbound',
      prearrivalComplaint: 'Respiratory distress',
      priority: 'P2',
    },
  ];

  private emergencyReferrals: Record<string, any>[] = [
    {
      id: 'ref-pt-001-cardiology',
      patientId: 'pt-001',
      requestingStaffId: 'staff-priya-nair',
      targetDepartment: 'Cardiology',
      urgency: 'Urgent',
      reason: 'Chest pain with elevated risk features.',
      clinicalSummary: 'Serial ECG and troponin pathway requested.',
      status: 'Sent',
      requestedAt: '2026-06-10T18:20:00-04:00',
      workflow: 'Referral',
    },
  ];

  @Get('patients')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get Emergency OS patients for the active tenant workspace' })
  getEmergencyPatients() {
    return this.emergencyPatients;
  }

  @Get('patients/:patientId')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get one Emergency OS patient by id' })
  getEmergencyPatient(@Param('patientId') patientId: string) {
    return this.emergencyPatients.find((patient) => patient.id === patientId) || null;
  }

  @Post('patients')
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create an Emergency OS intake patient' })
  createEmergencyPatient(@Body() body: Record<string, any>) {
    const now = new Date().toISOString();
    const patientId = body.id || `pt-${Date.now()}`;
    const patient = {
      id: patientId,
      mrn: body.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
      firstName: body.firstName || 'New',
      lastName: body.lastName || 'Patient',
      dob: body.dob || '1980-01-01',
      age: body.age || 46,
      sex: body.sex || 'Unknown',
      arrivalTime: body.arrivalTime || now,
      triageTime: body.triageTime || null,
      lastAssessedTime: body.lastAssessedTime || null,
      chiefComplaint: body.chiefComplaint || body.complaint || 'Unspecified complaint',
      complaintCategory: body.complaintCategory || body.chiefComplaint || 'General',
      state: body.state || 'Triage',
      priority: body.priority || 'P3',
      vitals: body.vitals || {
        hr: null,
        bpSystolic: null,
        bpDiastolic: null,
        spo2: null,
        temp: null,
        rr: null,
        gcs: null,
        pain: null,
        recordedAt: now,
      },
      assignedStaffId: body.assignedStaffId || null,
      roomId: body.roomId || null,
      flags: body.flags || [],
      timeline: [
        {
          id: `event-${Date.now()}`,
          patientId,
          type: 'Arrival',
          timestamp: now,
          summary: 'Created through Emergency OS intake API.',
        },
      ],
      notes: body.notes || [],
    };
    this.emergencyPatients = [...this.emergencyPatients, patient];
    return patient;
  }

  @Patch('patients/:patientId')
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Patch an Emergency OS patient' })
  updateEmergencyPatient(
    @Param('patientId') patientId: string,
    @Body() body: Record<string, any>,
  ) {
    let updatedPatient: Record<string, any> | null = null;
    this.emergencyPatients = this.emergencyPatients.map((patient) => {
      if (patient.id !== patientId) return patient;
      updatedPatient = { ...patient, ...body, id: patient.id };
      return updatedPatient;
    });
    return updatedPatient;
  }

  @Get('staff')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get Emergency OS staff roster' })
  getEmergencyStaff() {
    return this.emergencyStaff;
  }

  @Get('rooms')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get Emergency OS room grid' })
  getEmergencyRooms() {
    return this.emergencyRooms;
  }

  @Get('shift')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get active Emergency OS shift' })
  getEmergencyShift() {
    return this.emergencyShift;
  }

  @Get('ems')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get Emergency OS EMS unit and arrival state' })
  getEmergencyEms() {
    return {
      units: this.emergencyEmsUnits,
      arrivals: this.emergencyEmsArrivals,
    };
  }

  @Get('referrals')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get Emergency OS referrals' })
  getEmergencyReferrals() {
    return this.emergencyReferrals;
  }

  @Post('referrals')
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create an Emergency OS referral' })
  createEmergencyReferral(@Body() body: Record<string, any>) {
    const now = new Date().toISOString();
    const referral = {
      id: body.id || `ref-${body.patientId || 'patient'}-${Date.now()}`,
      patientId: body.patientId,
      requestingStaffId: body.requestingStaffId || 'staff-priya-nair',
      targetDepartment: body.targetDepartment || 'Other',
      urgency: body.urgency || 'Routine',
      reason: body.reason || 'Referral requested from Emergency OS.',
      clinicalSummary: body.clinicalSummary || body.reason || 'Clinical summary pending.',
      status: body.status || 'Sent',
      requestedAt: body.requestedAt || now,
      workflow: body.workflow || 'Referral',
    };
    this.emergencyReferrals = [...this.emergencyReferrals, referral];
    return referral;
  }

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
  createFhirConnection(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('fhir-connector', 'demo-patient', body);
  }

  @Post('integrations/fhir/:connectionId/test')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  testFhirConnection(
    @Param('connectionId') connectionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('fhir-connector', connectionId, body);
  }

  @Post('integrations/fhir/:connectionId/sync')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  syncFhirConnection(
    @Param('connectionId') connectionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('fhir-connector', connectionId, body);
  }

  @Get('integrations/hl7/interfaces')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  getHl7Interfaces() {
    return this.platformSystemsService.getHl7Interfaces();
  }

  @Post('integrations/hl7/interfaces/:interfaceId/test-message')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  testHl7Message(@Param('interfaceId') interfaceId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('hl7-bridge', interfaceId, body);
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
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('hl7-bridge', messageId, {
      ...body,
      replayMode: 'preview_only',
      writebackAllowed: false,
    });
  }

  @Get('source-provenance/:sourceId')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  async getSourceProvenance(@Param('sourceId') sourceId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getSourceProvenance(sourceId);
    }
    return this.platformSystemsService.getSourceProvenance(sourceId);
  }

  @Post('patients/import/ehr')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.IMPORT_PATIENT_DATA)
  importEhrPatient(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('ehr-patient-import', 'demo-patient', body);
  }

  @Post('patients/:patientId/import/labs')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importLabs(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('lab-result-import', patientId, body);
  }

  @Post('patients/:patientId/import/medications')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importMedications(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('medication-list-import', patientId, body);
  }

  @Post('patients/:patientId/import/observations')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importObservations(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('observation-vitals-import', patientId, body);
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
  createPatientEvent(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('clinical-event-ai', patientId, body);
  }

  @Get('patients/:patientId/risk-scores')
  @Permissions(Permission.READ_PHI)
  getRiskScores(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getRiskScores(patientId);
  }

  @Post('patients/:patientId/risk-scores')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  addRiskScore(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('risk-score-history', patientId, body);
  }

  @Get('patients/:patientId/care-plan')
  @Permissions(Permission.READ_PHI)
  getCarePlan(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getCarePlan(patientId);
  }

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

  @Get('governance/clinical/readiness')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getClinicalReadiness() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getSummary();
    }
    return this.platformSystemsService.getProductionReadiness();
  }

  @Get('governance/clinical/policies')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getClinicalPolicies() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listPolicies();
    }
    return this.platformSystemsService.demo('clinical-governance');
  }

  @Post('governance/clinical/policies')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async createClinicalPolicy(@Body() body: Record<string, unknown>) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.createPolicy(body);
    }
    return this.platformSystemsService.demo('clinical-governance', 'policy-draft', body);
  }

  @Put('governance/clinical/policies/:policyId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async updateClinicalPolicy(
    @Param('policyId') policyId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.updatePolicy(policyId, body);
      if (result) return result;
    }
    return this.platformSystemsService.demo('clinical-governance', policyId, body);
  }

  @Post('governance/clinical/policies/:policyId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async approveClinicalPolicy(
    @Param('policyId') policyId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.approvePolicy(policyId, body);
      if (result) return result;
    }
    return this.platformSystemsService.demo('clinical-governance', policyId, body);
  }

  @Get('governance/clinical/release-gates')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getClinicalReleaseGates() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listReleaseGates();
    }
    return this.platformSystemsService.demo('clinical-release-gates');
  }

  @Post('governance/clinical/release-gates/:gateId/decision')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async decideClinicalReleaseGate(
    @Param('gateId') gateId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.decideReleaseGate(gateId, body);
      if (result) return result;
    }
    return this.platformSystemsService.demo('clinical-release-gates', gateId, body);
  }

  @Get('governance/clinical/safety-findings')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async getGovernanceSafetyFindings() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listSafetyFindings();
    }
    return this.platformSystemsService.demo('clinical-safety-findings');
  }

  @Post('governance/clinical/safety-findings/:findingId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async reviewGovernanceSafetyFinding(
    @Param('findingId') findingId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.reviewSafetyFinding(findingId, body);
      if (result) return result;
    }
    return this.platformSystemsService.demo('clinical-safety-findings', findingId, body);
  }

  @Get('governance/ai/policies')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getAiPolicies() {
    return this.platformSystemsService.demo('ai-governance');
  }

  @Put('governance/ai/policies/:policyId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  updateAiPolicy(@Param('policyId') policyId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('ai-governance', policyId, body);
  }

  @Get('governance/ai-security/summary')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  getAiSecuritySummary() {
    return this.platformSystemsService.demo('ai-security');
  }

  @Get('governance/ai-security/rules')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  getPromptFirewallRules() {
    return this.platformSystemsService.demo('prompt-firewall');
  }

  @Put('governance/ai-security/rules/:ruleId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  updatePromptFirewallRule(@Param('ruleId') ruleId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('prompt-firewall', ruleId, body);
  }

  @Post('governance/ai-security/evaluate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  async evaluatePromptSecurity(@Body() body: Record<string, unknown>) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.evaluateGate({
        runId: String(body.runId || 'security-evaluation'),
        capabilityId: String(body.capabilityId || 'ai-security'),
        patientId: body.patientId ? String(body.patientId) : undefined,
        phiAccessed: Boolean(body.phiAccessed),
        prompt: String(body.prompt || body.input || ''),
        action: 'ai-security/evaluate',
      });
    }
    return this.platformSystemsService.demo('prompt-firewall', 'evaluation', body);
  }

  @Get('governance/ai-security/model-access')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  getModelAccessPolicies() {
    return this.platformSystemsService.demo('model-access-policy');
  }

  @Put('governance/ai-security/model-access/:policyId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  updateModelAccessPolicy(
    @Param('policyId') policyId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('model-access-policy', policyId, body);
  }

  @Get('governance/ai-security/incidents')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  getAiSecurityIncidents() {
    return this.platformSystemsService.demo('ai-security');
  }

  @Post('governance/ai-security/incidents/:incidentId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  reviewAiSecurityIncident(
    @Param('incidentId') incidentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('ai-security', incidentId, body);
  }

  @Get('governance/model-usage/summary')
  @Permissions(Permission.VIEW_ANALYTICS)
  getModelUsageSummary() {
    return this.platformSystemsService.demo('model-usage-dashboard');
  }

  @Get('governance/model-usage/events')
  @Permissions(Permission.VIEW_ANALYTICS)
  getModelUsageEvents() {
    return this.platformSystemsService.demo('model-usage-dashboard');
  }

  @Get('governance/costs/summary')
  @Permissions(Permission.MANAGE_SUBSCRIPTIONS, Permission.VIEW_ANALYTICS)
  getCostSummary() {
    return this.platformSystemsService.demo('cost-optimization-control-plane');
  }

  @Put('governance/costs/budgets/:budgetId')
  @Permissions(Permission.MANAGE_SUBSCRIPTIONS, Permission.VIEW_ANALYTICS)
  updateCostBudget(@Param('budgetId') budgetId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('cost-optimization-control-plane', budgetId, body);
  }

  @Get('governance/clinical-safety/findings')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  getClinicalSafetyFindings() {
    return this.platformSystemsService.demo('clinical-safety-audit');
  }

  @Post('governance/clinical-safety/findings/:findingId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  reviewClinicalSafetyFinding(
    @Param('findingId') findingId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('clinical-safety-audit', findingId, body);
  }

  @Get('consent/:patientId')
  @Permissions(Permission.MANAGE_CONSENT)
  async getConsent(@Param('patientId') patientId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getConsent(patientId);
    }
    return this.platformSystemsService.demo('consent-manager', patientId);
  }

  @Post('consent/:patientId')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_CONSENT)
  async updateConsent(
    @Param('patientId') patientId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.upsertConsent(
        patientId,
        String(body.scope || 'clinical_ai'),
        body,
      );
    }
    return this.platformSystemsService.demo('consent-manager', patientId, body);
  }

  @Post('consent/:patientId/revoke')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_CONSENT)
  async revokeConsent(
    @Param('patientId') patientId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.upsertConsent(
        patientId,
        String(body.scope || 'clinical_ai'),
        {
          ...body,
          status: 'revoked',
        },
      );
    }
    return this.platformSystemsService.demo('consent-manager', patientId, body);
  }

  @Get('privacy/access-log')
  @Permissions(Permission.MANAGE_PRIVACY)
  async getPrivacyAccessLog() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getPrivacyAccessLog();
    }
    return this.platformSystemsService.demo('privacy-center');
  }

  @Get('privacy/patient/:patientId/access-log')
  @Permissions(Permission.MANAGE_PRIVACY, Permission.READ_PHI)
  async getPatientPrivacyAccessLog(@Param('patientId') patientId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getPrivacyAccessLog(patientId);
    }
    return this.platformSystemsService.demo('privacy-center', patientId);
  }

  @Post('privacy/export')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY)
  async requestPrivacyExport(@Body() body: Record<string, unknown>) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.createPrivacyRequest(
        String(body.patientId || 'demo-patient'),
        'export',
        body,
      );
    }
    return this.platformSystemsService.demo('privacy-center', 'privacy-export', body);
  }

  @Post('privacy/delete-request')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY)
  async requestPrivacyDelete(@Body() body: Record<string, unknown>) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.createPrivacyRequest(
        String(body.patientId || 'demo-patient'),
        'delete',
        body,
      );
    }
    return this.platformSystemsService.demo('privacy-center', 'privacy-delete-request', body);
  }

  @Get('privacy/requests')
  @Permissions(Permission.MANAGE_PRIVACY)
  async getPrivacyRequests() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listPrivacyRequests();
    }
    return this.platformSystemsService.demo('privacy-center', 'privacy-requests');
  }

  @Post('privacy/requests/:requestId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY, Permission.VIEW_AUDIT_LOGS)
  async reviewPrivacyRequest(
    @Param('requestId') requestId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.reviewPrivacyRequest(requestId, body);
      if (result) return result;
    }
    return this.platformSystemsService.demo('privacy-center', requestId, body);
  }

  @Get('governance/regulatory/capabilities')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getRegulatoryCapabilities() {
    return this.platformSystemsService.demo('regulatory-classification');
  }

  @Get('governance/regulatory/capabilities/:capabilityId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getRegulatoryCapability(@Param('capabilityId') capabilityId: string) {
    return this.platformSystemsService.demo('regulatory-classification', capabilityId);
  }

  @Put('governance/regulatory/capabilities/:capabilityId/classification')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  updateRegulatoryClassification(
    @Param('capabilityId') capabilityId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('regulatory-classification', capabilityId, body);
  }

  @Post('governance/regulatory/capabilities/:capabilityId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  approveRegulatoryClassification(
    @Param('capabilityId') capabilityId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('regulatory-classification', capabilityId, body);
  }

  @Get('governance/regulatory/evidence/:capabilityId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getRegulatoryEvidence(@Param('capabilityId') capabilityId: string) {
    return this.platformSystemsService.demo('intended-use-registry', capabilityId);
  }

  @Post('governance/regulatory/evidence/:capabilityId/artifacts')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  createRegulatoryEvidenceArtifact(
    @Param('capabilityId') capabilityId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('intended-use-registry', capabilityId, body);
  }

  @Get('governance/equity/summary')
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  getEquitySummary() {
    return this.platformSystemsService.demo('equity-monitoring');
  }

  @Get('governance/equity/metrics')
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  getEquityMetrics() {
    return this.platformSystemsService.demo('equity-monitoring');
  }

  @Post('governance/equity/cohorts')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  createEquityCohort(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('equity-monitoring', 'cohort', body);
  }

  @Get('governance/equity/cohorts')
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  getEquityCohorts() {
    return this.platformSystemsService.demo('equity-monitoring');
  }

  @Get('governance/equity/findings')
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  getBiasFindings() {
    return this.platformSystemsService.demo('bias-finding-review');
  }

  @Post('governance/equity/findings/:findingId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  reviewBiasFinding(@Param('findingId') findingId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('bias-finding-review', findingId, body);
  }

  @Post('governance/equity/reports')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  createEquityReport(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('equity-monitoring', 'report', body);
  }

  @Get('governance/validation/scenarios')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getValidationScenarios() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listValidationScenarios();
    }
    return this.platformSystemsService.demo('validation-sandbox');
  }

  @Post('governance/validation/scenarios')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async createValidationScenario(@Body() body: Record<string, unknown>) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.createValidationScenario(body);
    }
    return this.platformSystemsService.demo('validation-sandbox', 'scenario', body);
  }

  @Get('governance/validation/synthetic-patients')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getSyntheticPatients() {
    return {
      patients: [
        this.platformGovernanceService?.syntheticFhirBundle() ??
          this.platformSystemsService.demo('synthetic-patient-lab'),
      ],
      synthetic: true,
    };
  }

  @Post('governance/validation/runs')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async createValidationRun(@Body() body: Record<string, unknown>) {
    if (this.platformGovernanceService) {
      const runId = String(body.runId || `validation-${Date.now()}`);
      const gate = await this.platformGovernanceService.createReleaseGate({
        capabilityId: String(body.capabilityId || 'clinical-governance'),
        changeType: String(body.changeType || 'validation'),
        artifactVersion: body.artifactVersion || body.version,
        riskLevel: String(body.riskLevel || 'high'),
        validationRunId: runId,
      });
      return {
        runId,
        status: 'release_gate_opened',
        gate,
        synthetic: true,
      };
    }
    return this.platformSystemsService.demo('validation-sandbox', 'run', body);
  }

  @Get('governance/validation/runs/:runId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getValidationRun(@Param('runId') runId: string) {
    return this.platformSystemsService.demo('validation-sandbox', runId);
  }

  @Post('governance/validation/runs/:runId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  approveValidationRun(@Param('runId') runId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('validation-sandbox', runId, body);
  }

  @Get('governance/validation/release-gates/:capabilityId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getValidationReleaseGate(@Param('capabilityId') capabilityId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listReleaseGates(capabilityId);
    }
    return this.platformSystemsService.demo('clinical-release-gates', capabilityId);
  }

  @Get('review/items')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async getReviewItems() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listReviewItems();
    }
    return this.platformSystemsService.getReviewItems();
  }

  @Post('review/items')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async createReviewItem(@Body() body: Record<string, unknown>) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.createReviewItem(body);
    }
    return this.platformSystemsService.demo('human-review-queue', 'review-item', body);
  }

  @Get('review/items/:itemId')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async getReviewItem(@Param('itemId') itemId: string) {
    if (this.platformGovernanceService) {
      const item = await this.platformGovernanceService.getReviewItem(itemId);
      if (item) return item;
    }
    return this.platformSystemsService.demo('human-review-queue', itemId);
  }

  @Post('review/items/:itemId/assign')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  assignReviewItem(@Param('itemId') itemId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('human-review-queue', itemId, body);
  }

  @Post('review/items/:itemId/decision')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async decideReviewItem(@Param('itemId') itemId: string, @Body() body: Record<string, unknown>) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.decideReviewItem(itemId, body);
      if (result) return result;
    }
    return this.platformSystemsService.demo('human-review-queue', itemId, body);
  }

  @Post('review/items/:itemId/comments')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  commentOnReviewItem(@Param('itemId') itemId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('human-review-queue', itemId, body);
  }

  @Get('patients/:patientId/review-items')
  @Permissions(Permission.READ_PHI, Permission.VIEW_AUDIT_LOGS)
  async getPatientReviewItems(@Param('patientId') patientId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listPatientReviewItems(patientId);
    }
    return this.platformSystemsService.demo('human-review-queue', patientId);
  }

  @Get('audit/events')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  getAuditEvents() {
    return this.platformSystemsService.demo('audit-trail-spine');
  }

  @Get('audit/events/:eventId')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  getAuditEvent(@Param('eventId') eventId: string) {
    return this.platformSystemsService.demo('audit-trail-spine', eventId);
  }

  @Get('audit/runs/:runId')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async getAuditRunTimeline(@Param('runId') runId: string) {
    if (this.platformGovernanceService) {
      await this.platformGovernanceService.recordObservabilityEvent({
        correlationId: runId,
        capabilityId: 'ai-run-audit-timeline',
        eventType: 'audit.ai_run.timeline_viewed',
        status: 'viewed',
      });
    }
    return this.platformSystemsService.getAuditRunTimeline(runId);
  }

  @Get('audit/patients/:patientId/access')
  @Permissions(Permission.VIEW_AUDIT_LOGS, Permission.READ_PHI)
  async getPatientAuditAccess(@Param('patientId') patientId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getPrivacyAccessLog(patientId);
    }
    return this.platformSystemsService.demo('audit-trail-spine', patientId);
  }

  @Get('audit/integrity/status')
  @Permissions(Permission.VERIFY_AUDIT_INTEGRITY)
  async getAuditIntegrityStatus() {
    if (this.platformGovernanceService) {
      await this.platformGovernanceService.recordObservabilityEvent({
        capabilityId: 'audit-trail-spine',
        eventType: 'audit.integrity.checked',
        status: 'checked',
      });
    }
    return this.platformSystemsService.getAuditIntegrityStatus();
  }

  @Post('audit/integrity/verify')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VERIFY_AUDIT_INTEGRITY)
  verifyAuditIntegrityPlaceholder(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('audit-trail-spine', 'integrity-verify', body);
  }

  @Post('audit/export')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.EXPORT_AUDIT_LOGS)
  exportAuditPlaceholder(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('audit-trail-spine', 'audit-export', body);
  }

  @Get('operations/health')
  @Permissions(Permission.VIEW_ANALYTICS)
  async getOperationsHealth() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.recentObservability();
    }
    return this.platformSystemsService.getOperationsHealth();
  }

  @Get('operations/service-health')
  @Permissions(Permission.VIEW_ANALYTICS)
  async getServiceHealth() {
    return this.getOperationsHealth();
  }

  @Get('operations/observability/summary')
  @Permissions(Permission.VIEW_ANALYTICS)
  async getObservabilitySummary() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.recentObservability();
    }
    return this.platformSystemsService.getObservabilitySummary();
  }

  @Get('operations/observability/ai-runs')
  @Permissions(Permission.VIEW_ANALYTICS)
  getAiRunMetrics() {
    return this.platformSystemsService.demo('deployment-observability');
  }

  @Get('operations/observability/orchestrator')
  @Permissions(Permission.VIEW_ANALYTICS)
  getOrchestratorMetrics() {
    return this.platformSystemsService.demo('deployment-observability');
  }

  @Get('operations/observability/integrations')
  @Permissions(Permission.VIEW_ANALYTICS)
  getIntegrationHealth() {
    return this.platformSystemsService.demo('deployment-observability');
  }

  @Get('operations/deployments/current')
  @Permissions(Permission.VIEW_ANALYTICS)
  getCurrentDeployment() {
    return this.platformSystemsService.demo('deployment-observability');
  }

  @Get('operations/incidents')
  @Permissions(Permission.VIEW_ANALYTICS)
  getOperationsIncidents() {
    return this.platformSystemsService.demo('operations-incident-center');
  }

  @Post('operations/incidents/:incidentId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_ANALYTICS)
  reviewOperationsIncident(
    @Param('incidentId') incidentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('operations-incident-center', incidentId, body);
  }
}
