import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import {
  AICallInterrogationController,
  ERPulseHandoverController,
  FederatedEMSController,
  LMECSController,
  OrganizationalDigitalTwinController,
} from './emergency-os.research.controller';
import { AICallInterrogationService } from '../../services/ai-call-interrogation.service';
import { EdgeAIAmbulanceService } from '../../services/edge-ai-ambulance.service';
import { FederatedEMSService } from '../../services/federated-ems.service';
import { LMECSService } from '../../services/lmecs.service';
import { OrganizationalDigitalTwin } from '../../services/organizational-digital-twin.service';
import { ERPulseHandoverService } from '../../services/smart-handover-v2.service';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';

describe('CareDroid research controllers', () => {
  let handoverController: ERPulseHandoverController;
  let federatedEMSController: FederatedEMSController;
  let lmecsController: LMECSController;
  let callInterrogationController: AICallInterrogationController;
  let organizationalDigitalTwinController: OrganizationalDigitalTwinController;
  let edgeAIAmbulanceService: EdgeAIAmbulanceService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        ERPulseHandoverController,
        FederatedEMSController,
        LMECSController,
        AICallInterrogationController,
        OrganizationalDigitalTwinController,
      ],
      providers: [
        ERPulseHandoverService,
        FederatedEMSService,
        LMECSService,
        AICallInterrogationService,
        EdgeAIAmbulanceService,
        OrganizationalDigitalTwin,
      ],
    })
      // HEAL-347.83: these 5 controllers now carry handler-level
      // AuthorizationGuard on their PHI-touching routes (previously had no
      // permission decorator at all). This suite calls controller methods
      // directly, not through the real HTTP guard pipeline, so the guard's
      // own behavior is irrelevant here -- but Nest's DI container still
      // eagerly resolves every provider referenced by a @UseGuards() class,
      // including AuthorizationGuard's real AuditService dependency, at
      // compile() time. Override with a no-op the same way
      // emergency-os.controller.spec.ts already does for the same guard.
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    handoverController = moduleRef.get(ERPulseHandoverController);
    federatedEMSController = moduleRef.get(FederatedEMSController);
    lmecsController = moduleRef.get(LMECSController);
    callInterrogationController = moduleRef.get(AICallInterrogationController);
    organizationalDigitalTwinController = moduleRef.get(OrganizationalDigitalTwinController);
    edgeAIAmbulanceService = moduleRef.get(EdgeAIAmbulanceService);
  });

  it('generates ER-Pulse SBAR handover summaries', async () => {
    const summary = await handoverController.generateERPulseHandover({
      patientId: 'patient-1',
      patient: {
        chiefComplaint: 'Chest pain',
        labs: [{ name: 'Troponin', value: 0.12, unit: 'ng/mL', abnormal: true }],
      },
    });

    expect(summary.patientId).toBe('patient-1');
    expect(summary.summary.situation).toContain('Chest pain');
    expect(summary.abnormalLabs).toContain('Troponin 0.12 ng/mL');
    expect(summary.generationTimeSeconds).toBeLessThan(5);
  });

  it('reports federated EMS service info and health (Cycle 285)', () => {
    expect(federatedEMSController.info()).toMatchObject({
      path: '/federated',
      version: 'v1',
      status: 'active',
    });
    expect(federatedEMSController.health()).toEqual({
      status: 'ready',
      service: 'federated-ems',
    });
  });

  it('runs a federated training round and registers the contributing hospital (Cycle 285)', async () => {
    const result = await federatedEMSController.trainingRound({
      hospitalId: 'hospital-b',
      dataQualityScore: 0.95,
    });

    expect(result).toEqual({
      success: true,
      round: { status: 'completed', contributor: 'hospital-b' },
    });
  });

  it('defaults the training round contributor and local model when omitted', async () => {
    const result = await federatedEMSController.trainingRound({});

    expect(result.round.contributor).toBe('integration-hospital');
  });

  it('processes federated 112 calls with dispatch coordination', async () => {
    const result = await federatedEMSController.process112Call({
      callId: '112-test',
      urgencyLevel: 'immediate',
      location: { lat: 43.65, lng: -79.38, accuracy: 20 },
      callerMetadata: { language: 'en', distressLevel: 9, backgroundNoise: 20 },
      wearableData: { heartRate: 142, oxygenSaturation: 88, fallDetected: false },
    });

    expect(result.callId).toBe('112-test');
    expect(result.triage.priorityCode).toBe(1);
    expect(result.dispatch.nearestAmbulance).toEqual(expect.any(String));
    expect(result.privacyMode).toBe('edge-inference-federated-learning');
  });

  it('selects top LMECS clients and predicts severity', async () => {
    const selected = await lmecsController.selectClients({ clients: undefined });
    const severity = await lmecsController.predictSeverity({
      hospitalId: 'hospital-a',
      patientData: {
        triageCode: 'CTAS2',
        chiefComplaint: 'Shortness of breath',
        vitals: { oxygenSaturation: 89, systolicBp: 92 },
      },
    });

    expect(selected).toHaveLength(1);
    expect(selected[0].selectionPriority).toBeGreaterThan(0);
    expect(severity.severityLevel).toBe('high');
    expect(severity.contributingFactors).toContain('Low oxygen saturation');
  });

  it('detects OHCA and recommends high-priority dispatch', async () => {
    const result = await callInterrogationController.detectOHCA({
      callId: 'call-ohca',
      transcriptHint: 'Please hurry, he collapsed and is not breathing. He is turning blue!',
      backgroundNoise: 15,
    });

    expect(result.detection.ohcaDetected).toBe(true);
    expect(result.detection.keyPhrases).toEqual(
      expect.arrayContaining(['not breathing', 'collapsed']),
    );
    expect(result.dispatch.priority).toBe(1);
  });

  /**
   * Regression coverage for a real, safety-relevant bug found by a
   * repository-wide domain-model audit (2026-08-08): with no transcriptHint,
   * genuinely binary audio bytes don't decode to valid UTF-8 text (there is
   * no real speech-to-text integration here), and this code used to
   * silently substitute a HARDCODED, maximally-alarming fake transcript
   * ("Caller reports patient collapsed and is not breathing after becoming
   * unconscious.") -- which would then always trigger OHCA detection and a
   * priority-1 dispatch recommendation for what is actually a total absence
   * of signal, not a real cardiac-arrest call. Real audio bytes almost never
   * decode to intelligible text this way, so this path fired for nearly
   * every genuine (non-hint) call, not just an edge case.
   */
  it('does NOT fabricate a fake transcript for real (non-hint) audio bytes with no real speech-to-text signal', async () => {
    // Genuinely binary bytes (0x00-0xFF), not valid printable UTF-8 text --
    // representative of real audio, which this service has no real
    // transcription pipeline for.
    const binaryAudio = Buffer.from(Array.from({ length: 64 }, (_, i) => i * 4));

    const result = await callInterrogationController.detectOHCA({
      callId: 'call-no-hint',
      audioBase64: binaryAudio.toString('base64'),
      backgroundNoise: 15,
    });

    expect(result.detection.transcription).not.toContain('collapsed');
    expect(result.detection.transcription).not.toContain('not breathing');
    expect(result.detection.keyPhrases).toEqual([]);
    expect(result.detection.ohcaDetected).toBe(false);
    expect(result.dispatch.priority).not.toBe(1);
  });

  it('runs organizational digital twin synchronization and simulation', async () => {
    const synchronized = await organizationalDigitalTwinController.synchronizePatientFlow({
      census: 60,
      waitingPatients: 18,
    });
    const forecast = await organizationalDigitalTwinController.runPredictiveSimulation({
      scenario: 'open fast track',
    });

    expect(synchronized.currentCensus).toBeGreaterThan(0);
    expect(synchronized.predictedNextState.capacityPressure).toBeGreaterThan(0);
    expect(forecast.censusForecast).toHaveLength(9);
    expect(forecast.confidenceIntervals.waitMinutes).toHaveLength(9);
  });

  it('supports edge ambulance ultrasound and vital sign inference', async () => {
    const ultrasound = await edgeAIAmbulanceService.analyzeUltrasound([
      Buffer.from('frame-1'),
      Buffer.from('frame-2'),
      Buffer.from('frame-3'),
    ]);
    const vitals = await edgeAIAmbulanceService.monitorVitalSignsEdge({
      samples: [{ heartRate: 138, systolicBp: 84, oxygenSaturation: 88, respiratoryRate: 32 }],
      context: { mechanism: 'major_trauma' },
    });

    expect(ultrasound.processingTimeMs).toBeGreaterThan(0);
    expect(vitals.alertLevel).toBe('critical');
    expect(vitals.predictedComplications).toEqual(
      expect.arrayContaining(['shock', 'cardiac_arrest_risk']),
    );
  });
});
