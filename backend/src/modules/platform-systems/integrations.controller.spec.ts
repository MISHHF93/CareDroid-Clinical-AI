import { IntegrationsController } from './integrations.controller';

describe('IntegrationsController', () => {
  const buildController = (withGovernance = true) => {
    const platformSystemsService = {
      demo: jest.fn((capabilityId: string, id?: string, payload?: Record<string, unknown>) => ({
        capabilityId,
        id,
        payload,
        status: 'demo_review_required',
      })),
      getCapability: jest.fn((capabilityId: string) => ({ capabilityId, contract: 'demo' })),
      getPack: jest.fn((pack: string) => ({ pack, capabilities: [] })),
      getFhirConnections: jest.fn(() => ({ connections: [] })),
      getHl7Interfaces: jest.fn(() => ({ interfaces: [] })),
      getSourceProvenance: jest.fn((sourceId: string) => ({ sourceId, fallback: true })),
    };
    const platformGovernanceService = withGovernance
      ? { getSourceProvenance: jest.fn((sourceId: string) => ({ sourceId, governed: true })) }
      : undefined;

    return {
      controller: new IntegrationsController(
        platformSystemsService as any,
        platformGovernanceService as any,
      ),
      platformSystemsService,
      platformGovernanceService,
    };
  };

  it('routes capability lookups through the platform systems service', () => {
    const { controller, platformSystemsService } = buildController();

    expect(controller.getCapability('calculator-recommender-ai')).toEqual({
      capabilityId: 'calculator-recommender-ai',
      contract: 'demo',
    });
    expect(platformSystemsService.getCapability).toHaveBeenCalledWith('calculator-recommender-ai');
  });

  it('routes pack lookups through the platform systems service', () => {
    const { controller, platformSystemsService } = buildController();

    controller.getPack('clinical-intelligence');

    expect(platformSystemsService.getPack).toHaveBeenCalledWith('clinical-intelligence');
  });

  it('lists FHIR connections through the platform systems service', () => {
    const { controller, platformSystemsService } = buildController();

    controller.getFhirConnections();

    expect(platformSystemsService.getFhirConnections).toHaveBeenCalled();
  });

  it('creates a FHIR connection through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.createFhirConnection({ baseUrl: 'https://fhir.example.org' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('fhir-connector', 'demo-patient', {
      baseUrl: 'https://fhir.example.org',
    });
  });

  it('tests a FHIR connection with the real connectionId as the target', () => {
    const { controller, platformSystemsService } = buildController();

    controller.testFhirConnection('conn-1', { ping: true });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('fhir-connector', 'conn-1', {
      ping: true,
    });
  });

  it('syncs a FHIR connection with the real connectionId as the target', () => {
    const { controller, platformSystemsService } = buildController();

    controller.syncFhirConnection('conn-2', { fullSync: true });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('fhir-connector', 'conn-2', {
      fullSync: true,
    });
  });

  it('lists HL7 interfaces through the platform systems service', () => {
    const { controller, platformSystemsService } = buildController();

    controller.getHl7Interfaces();

    expect(platformSystemsService.getHl7Interfaces).toHaveBeenCalled();
  });

  it('tests an HL7 message with the real interfaceId as the target', () => {
    const { controller, platformSystemsService } = buildController();

    controller.testHl7Message('iface-1', { message: 'MSH|...' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('hl7-bridge', 'iface-1', {
      message: 'MSH|...',
    });
  });

  it('gets the HL7 message quarantine through the demo capability contract', () => {
    const { controller, platformSystemsService } = buildController();

    controller.getHl7MessageQuarantine();

    expect(platformSystemsService.demo).toHaveBeenCalledWith('hl7-bridge', 'quarantine');
  });

  it('previews an HL7 message replay as read-only, forcing preview mode', () => {
    const { controller, platformSystemsService } = buildController();

    controller.previewHl7MessageReplay('msg-1', { targetSystem: 'lab-system' });

    expect(platformSystemsService.demo).toHaveBeenCalledWith('hl7-bridge', 'msg-1', {
      targetSystem: 'lab-system',
      replayMode: 'preview_only',
      writebackAllowed: false,
    });
  });

  it('routes source provenance through the durable governance service when available', async () => {
    const { controller, platformGovernanceService } = buildController(true);

    await expect(controller.getSourceProvenance('source-1')).resolves.toEqual({
      sourceId: 'source-1',
      governed: true,
    });
    expect(platformGovernanceService?.getSourceProvenance).toHaveBeenCalledWith('source-1');
  });

  it('falls back to the platform systems service when governance is unavailable', async () => {
    const { controller, platformSystemsService } = buildController(false);

    await expect(controller.getSourceProvenance('source-2')).resolves.toEqual({
      sourceId: 'source-2',
      fallback: true,
    });
    expect(platformSystemsService.getSourceProvenance).toHaveBeenCalledWith('source-2');
  });
});
