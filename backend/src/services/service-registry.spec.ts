import {
  checkServiceHealth,
  emergencyOsServiceRegistry,
  initializeAllServices,
  REQUIRED_SERVICE_NAMES,
} from './service-registry';

const expectedServiceNames = [
  'capacityService',
  'emsService',
  'reassessmentService',
  'patientJourneyService',
  'queueIntelligenceService',
  'surgeCapacityService',
  'boardingService',
  'dischargePredictionService',
  'clinicalProtocolService',
  'deteriorationPredictionV3Service',
  'copilotService',
  'erPulseHandoverService',
  'aiCallInterrogationService',
  'smartIntakeService',
  'mpiService',
  'ocrService',
  'mohFhirService',
  'wearableRPMService',
  'federatedEMSService',
  'lmecsService',
  'iotDigitalTwinService',
  'realTimeSimulationService',
  'hybridDigitalTwinService',
  'organizationalDigitalTwinService',
  'aiGovernanceService',
  'incidentReportingService',
  'consentService',
];

describe('Emergency OS service registry', () => {
  it('exports every required singleton name', () => {
    expect(Object.keys(emergencyOsServiceRegistry).sort()).toEqual(expectedServiceNames.sort());
    expect(REQUIRED_SERVICE_NAMES.sort()).toEqual(expectedServiceNames.sort());
  });

  it('initializes services with lifecycle methods without failing the registry', async () => {
    const summary = await initializeAllServices();

    expect(summary.totals.registered).toBe(expectedServiceNames.length);
    expect(summary.totals.failed).toBe(0);
    expect(summary.services.ocrService.methodsCalled).toContain('initialize');
  });

  it('returns health status for every service', async () => {
    const health = await checkServiceHealth();

    expect(health.totals.registered).toBe(expectedServiceNames.length);
    expect(Object.keys(health.services).sort()).toEqual(expectedServiceNames.sort());
    expect(health.totals.failed).toBe(0);
  });
});
