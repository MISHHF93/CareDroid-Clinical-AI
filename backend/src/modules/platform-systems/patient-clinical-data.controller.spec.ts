import { PatientClinicalDataController } from './patient-clinical-data.controller';

describe('PatientClinicalDataController', () => {
  const buildController = (withGovernance = true) => {
    const platformSystemsService = {
      demo: jest.fn((capabilityId: string, id?: string, payload?: Record<string, unknown>) => ({
        capabilityId,
        id,
        payload,
        status: 'demo_review_required',
      })),
      getPatientWorkspace: jest.fn((patientId: string) => ({ patientId, workspace: 'shell' })),
      getSourceProvenance: jest.fn((sourceId: string) => ({ sourceId, fallback: true })),
      getTimeline: jest.fn((patientId: string) => ({ patientId, events: [] })),
      getRiskScores: jest.fn((patientId: string) => ({ patientId, scores: [] })),
      getCarePlan: jest.fn((patientId: string) => ({ patientId, carePlan: null })),
    };
    const platformGovernanceService = withGovernance
      ? { getPatientSourceData: jest.fn((patientId: string) => ({ patientId, sources: [] })) }
      : undefined;

    return {
      controller: new PatientClinicalDataController(
        platformSystemsService as any,
        platformGovernanceService as any,
      ),
      platformSystemsService,
      platformGovernanceService,
    };
  };

  it('imports an EHR patient through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.importEhrPatient({ mrn: '12345' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('ehr-patient-import', 'demo-patient', {
      mrn: '12345',
    });
  });

  it('imports labs for the real patientId as the target', () => {
    const { controller, platformSystemsService } = buildController();

    controller.importLabs('pt-001', { panel: 'BMP' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('lab-result-import', 'pt-001', {
      panel: 'BMP',
    });
  });

  it('imports medications for the real patientId as the target', () => {
    const { controller, platformSystemsService } = buildController();

    controller.importMedications('pt-001', { medication: 'apixaban' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('medication-list-import', 'pt-001', {
      medication: 'apixaban',
    });
  });

  it('imports observations for the real patientId as the target', () => {
    const { controller, platformSystemsService } = buildController();

    controller.importObservations('pt-001', { vital: 'heartRate' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith(
      'observation-vitals-import',
      'pt-001',
      { vital: 'heartRate' },
    );
  });

  it('gets the patient workspace through the platform systems service', () => {
    const { controller, platformSystemsService } = buildController();

    expect(controller.getPatientWorkspace('pt-001')).toEqual({
      patientId: 'pt-001',
      workspace: 'shell',
    });
    expect(platformSystemsService.getPatientWorkspace).toHaveBeenCalledWith('pt-001');
  });

  it('routes patient source data through the durable governance service when available', async () => {
    const { controller, platformGovernanceService } = buildController(true);

    await expect(controller.getPatientSourceData('pt-001')).resolves.toEqual({
      patientId: 'pt-001',
      sources: [],
    });
    expect(platformGovernanceService?.getPatientSourceData).toHaveBeenCalledWith('pt-001');
  });

  it('falls back to the platform systems service when governance is unavailable', async () => {
    const { controller, platformSystemsService } = buildController(false);

    await expect(controller.getPatientSourceData('pt-002')).resolves.toEqual({
      sourceId: 'pt-002',
      fallback: true,
    });
    expect(platformSystemsService.getSourceProvenance).toHaveBeenCalledWith('pt-002');
  });

  it('gets the patient summary shell through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.getPatientSummaryShell('pt-001');

    expect(platformSystemsService.demo).toHaveBeenCalledWith('patient-summary-ai', 'pt-001');
  });

  it('gets the patient timeline through the platform systems service', () => {
    const { controller, platformSystemsService } = buildController();

    expect(controller.getTimeline('pt-001')).toEqual({ patientId: 'pt-001', events: [] });
    expect(platformSystemsService.getTimeline).toHaveBeenCalledWith('pt-001');
  });

  it('creates a patient event through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.createPatientEvent('pt-001', { eventType: 'medication-administered' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('clinical-event-ai', 'pt-001', {
      eventType: 'medication-administered',
    });
  });

  it('gets risk scores through the platform systems service', () => {
    const { controller, platformSystemsService } = buildController();

    expect(controller.getRiskScores('pt-001')).toEqual({ patientId: 'pt-001', scores: [] });
    expect(platformSystemsService.getRiskScores).toHaveBeenCalledWith('pt-001');
  });

  it('adds a risk score through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.addRiskScore('pt-001', { score: 'HEART', value: 5 });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('risk-score-history', 'pt-001', {
      score: 'HEART',
      value: 5,
    });
  });

  it('gets the care plan through the platform systems service', () => {
    const { controller, platformSystemsService } = buildController();

    expect(controller.getCarePlan('pt-001')).toEqual({ patientId: 'pt-001', carePlan: null });
    expect(platformSystemsService.getCarePlan).toHaveBeenCalledWith('pt-001');
  });
});
