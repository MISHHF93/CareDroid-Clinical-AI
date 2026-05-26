import { NotFoundException } from '@nestjs/common';
import { PlatformSystemsService } from './platform-systems.service';

describe('PlatformSystemsService', () => {
  let service: PlatformSystemsService;

  beforeEach(() => {
    service = new PlatformSystemsService();
  });

  it('returns demo contracts without advertising orchestrator execution', () => {
    const contract = service.getCapability('clinical-governance');

    expect(contract.capabilityId).toBe('clinical-governance');
    expect(contract.endpoint).toBe('/api/governance/clinical/readiness');
    expect(contract.endpoint).not.toMatch(/^\/api\/tools\/.+\/execute$/);
    expect(contract.sourceKind).toBe('platform');
    expect(contract.executorStatus).toBe('platform');
    expect(contract.riskLevel).toBe('critical');
    expect(contract.permissionPolicy).toEqual(expect.arrayContaining(['VIEW_GOVERNANCE']));
    expect(contract.apiClient).toBe('platformGovernanceApi');
    expect(contract.auditEvents).toEqual(expect.arrayContaining(['governance.policy.created']));
    expect(contract.dashboardPlacement).toEqual(expect.arrayContaining(['/governance']));
    expect(contract.criticality).toBe('P0');
    expect(contract.regulatoryClassificationRequired).toBe(true);
    expect(contract.safety.reviewRequired).toBe(true);
    expect(contract.safety.demoMode).toBe(true);
  });

  it('returns pack summaries for all five platform systems', () => {
    expect(service.getPack('Interoperability').capabilities).toHaveLength(7);
    expect(service.getPack('AI Workflow').capabilities).toHaveLength(6);
    expect(service.getPack('Patient Workspace').capabilities).toHaveLength(6);
    expect(service.getPack('Documentation').capabilities).toHaveLength(6);
    expect(service.getPack('Governance').capabilities).toHaveLength(24);
  });

  it('marks every platform capability as a non-executor inventory contract', () => {
    const allContracts = service.getPack('all').capabilities;

    expect(allContracts.length).toBeGreaterThan(20);
    allContracts.forEach((contract) => {
      expect(contract.sourceKind).toBe('platform');
      expect(contract.executorStatus).toBe('platform');
      expect(contract.endpoint).not.toMatch(/^\/api\/tools\/.+\/execute$/);
      expect(contract.permissionPolicy.length).toBeGreaterThan(0);
      expect(contract.auditEvents.length).toBeGreaterThan(0);
      expect(contract.dashboardPlacement.length).toBeGreaterThan(0);
    });
  });

  it('returns P0 readiness blockers without taking autonomous action', () => {
    const readiness = service.getProductionReadiness();

    expect(readiness.status).toBe('unsupported_until_configured');
    expect(readiness.reviewRequired).toBe(true);
    expect(readiness.data.autonomousActionTaken).toBe(false);
    expect(readiness.data.blockers).toContain('clinical_governance_policy_required');
    expect(readiness.data.p0Capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capabilityId: 'ai-security',
          reviewRequired: true,
          autonomousActionTaken: false,
        }),
      ]),
    );
  });

  it('raises for unknown capabilities', () => {
    expect(() => service.getCapability('not-real')).toThrow(NotFoundException);
  });
});
