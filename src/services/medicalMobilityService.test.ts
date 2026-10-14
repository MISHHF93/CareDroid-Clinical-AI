import { describe, it, expect, beforeEach } from 'vitest';
import {
  fetchMobilityMissions,
  fetchMobilityVehicles,
  fetchRecognitionEvents,
  createMobilityMission,
  executeMissionOperatorAction,
  triggerSimulationScenario,
  queryMobilityAiAssistant,
  resetMockMissionsStore,
} from './medicalMobilityService';

describe('medicalMobilityService', () => {
  beforeEach(() => {
    resetMockMissionsStore();
  });

  it('fetches initial mobility missions', async () => {
    const res = await fetchMobilityMissions();
    expect(res.ok).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0].id).toBe('msn-001');
    expect(res.data[0].itemCategory).toBe('BLOOD_PRODUCTS');
  });

  it('fetches initial mobility vehicles', async () => {
    const res = await fetchMobilityVehicles();
    expect(res.ok).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.some((v) => v.type === 'INTERNAL_HOSPITAL_AMR')).toBe(true);
    expect(res.data.some((v) => v.type === 'DELIVERY_DRONE')).toBe(true);
  });

  it('fetches initial recognition events', async () => {
    const res = await fetchRecognitionEvents();
    expect(res.ok).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0].recognitionState).toBe('RELEVANT_OBJECT_DETECTED');
  });

  it('creates a new mobility mission', async () => {
    const newMission = await createMobilityMission({
      itemCategory: 'ORGAN_TRANSIT',
      priority: 'CRITICAL',
      payload: {
        itemDescription: 'Donor Kidney Specimen in TransMedics OCS',
        quantity: '1 organ',
        weightKg: 8.5,
        temperatureRequirement: { targetCelsius: 4.0, minCelsius: 2.0, maxCelsius: 6.0 },
      },
    });

    expect(newMission.ok).toBe(true);
    expect(newMission.data?.itemCategory).toBe('ORGAN_TRANSIT');
    expect(newMission.data?.priority).toBe('CRITICAL');

    const all = await fetchMobilityMissions();
    expect(all.data.some((m) => m.itemCategory === 'ORGAN_TRANSIT')).toBe(true);
  });

  it('executes governed operator actions (PAUSE, RESUME, VERIFY_HANDOFF)', async () => {
    const pauseRes = await executeMissionOperatorAction(
      'msn-001',
      'PAUSE',
      'operator-unit-test',
      'Corridor maintenance in progress',
    );
    expect(pauseRes.ok).toBe(true);
    expect(pauseRes.data?.status).toBe('PAUSED');

    const resumeRes = await executeMissionOperatorAction(
      'msn-001',
      'RESUME',
      'operator-unit-test',
      'Corridor cleared',
    );
    expect(resumeRes.ok).toBe(true);
    expect(resumeRes.data?.status).toBe('EN_ROUTE');

    const handoffRes = await executeMissionOperatorAction(
      'msn-001',
      'VERIFY_HANDOFF',
      'operator-unit-test',
      'Surgical team confirmed receipt',
      {
        recipientName: 'Nurse Chen, RN',
        recipientRole: 'Charge Nurse',
        verificationMethod: 'NFC_BADGE_SCAN',
        signatureOrToken: 'SIG-VERIFIED-NFC-9912',
        tamperSealIntact: true,
        temperatureAtHandoffCelsius: 4.2,
      },
    );
    expect(handoffRes.ok).toBe(true);
    expect(handoffRes.data?.status).toBe('COMPLETED');
    expect(handoffRes.data?.deliveryEvidence?.recipientName).toBe('Nurse Chen, RN');
    expect(handoffRes.data?.deliveryEvidence?.tamperSealIntact).toBe(true);
  });

  it('triggers a simulation scenario', async () => {
    const res = await triggerSimulationScenario('SCENARIO_RELEVANT_OBJECT_DETECTION', 'msn-001');
    expect(res.ok).toBe(true);
  });

  it('queries the AI Operations Assistant', async () => {
    const res = await queryMobilityAiAssistant('What is the status of msn-001?');
    expect(res.ok).toBe(true);
    expect(res.data.disclaimer).toBeDefined();
  });
});
