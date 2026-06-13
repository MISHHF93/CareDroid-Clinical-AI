import { Test } from '@nestjs/testing';
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

describe('Emergency OS research controllers', () => {
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
    }).compile();

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
