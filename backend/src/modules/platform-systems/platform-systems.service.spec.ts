import { NotFoundException } from '@nestjs/common';
import { PlatformSystemsService } from './platform-systems.service';

describe('PlatformSystemsService', () => {
  let service: PlatformSystemsService;

  beforeEach(() => {
    service = new PlatformSystemsService();
  });

  it('returns demo contracts without advertising orchestrator execution', () => {
    const contract = service.getCapability('workflow-builder-ai');

    expect(contract.capabilityId).toBe('workflow-builder-ai');
    expect(contract.endpoint).toBe('/api/clinical-intelligence/workflow-builder/generate');
    expect(contract.endpoint).not.toMatch(/^\/api\/tools\/.+\/execute$/);
    expect(contract.safety.reviewRequired).toBe(true);
    expect(contract.safety.demoMode).toBe(true);
  });

  it('returns pack summaries for all five platform systems', () => {
    expect(service.getPack('Interoperability').capabilities).toHaveLength(6);
    expect(service.getPack('AI Workflow').capabilities).toHaveLength(6);
    expect(service.getPack('Patient Workspace').capabilities).toHaveLength(6);
    expect(service.getPack('Documentation').capabilities).toHaveLength(6);
    expect(service.getPack('Governance').capabilities).toHaveLength(6);
  });

  it('raises for unknown capabilities', () => {
    expect(() => service.getCapability('not-real')).toThrow(NotFoundException);
  });
});
