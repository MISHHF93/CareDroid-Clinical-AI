import { SEED_ASSET_PACKS, SEED_PLATFORM_ASSETS } from './data/platform-asset-seed.data';
import { PlatformGovernanceRegistryService } from './platform-governance-registry.service';

describe('PlatformGovernanceRegistryService', () => {
  function buildService(assets: any[], packs: any[] = []) {
    return new PlatformGovernanceRegistryService(
      {
        listAssets: jest.fn().mockResolvedValue(assets),
      } as any,
      {
        find: jest.fn().mockResolvedValue(packs),
      } as any,
    );
  }

  it('projects every requested governance field for platform assets', async () => {
    const service = buildService(
      [
        {
          id: 'qsofa',
          title: 'qSOFA',
          assetType: 'calculator',
          type: 'calculator',
          category: 'Calculator',
          route: '/tools/calculators/qsofa',
          lifecycle: 'active',
          lifecycleStatus: 'active',
          riskLevel: 'clinical-decision-support',
          catalogVersion: '2.1.0',
          packIds: ['emergency-department-pack'],
          governance: {
            owner: 'ED Director',
            steward: 'Emergency Medicine Steward',
            approver: 'Clinical Governance Lead',
            evidenceSource: 'validated protocol library',
            auditRequirement: 'required',
            reviewSchedule: 'quarterly',
          },
        },
      ],
      [
        {
          id: 'emergency-department-pack',
          name: 'Emergency Department Pack',
          salesMetadata: { buyerPersona: ['ED Director'] },
        },
      ],
    );

    const result = await service.getRegistry();

    expect(result.summary.totalAssets).toBe(1);
    expect(result.summary.complete).toBe(1);
    expect(result.rows[0]).toMatchObject({
      assetId: 'qsofa',
      owner: 'ED Director',
      steward: 'Emergency Medicine Steward',
      approver: 'Clinical Governance Lead',
      riskLevel: 'clinical-decision-support',
      evidenceSource: 'validated protocol library',
      version: '2.1.0',
      auditRequirement: 'required',
      reviewSchedule: 'quarterly',
      completeness: 'complete',
    });
  });

  it('derives governance defaults from pack and asset metadata for older assets', async () => {
    const service = buildService(
      [
        {
          id: 'fhir-connector',
          title: 'FHIR Connector',
          assetType: 'integration',
          type: 'integration',
          category: 'Interoperability',
          route: '/integrations/fhir',
          riskLevel: 'operational',
          catalogVersion: '1.0.0',
          packIds: ['core-platform'],
          governance: {},
        },
      ],
      [
        {
          id: 'core-platform',
          name: 'Core Platform',
          salesMetadata: { buyerPersona: ['CIO'] },
        },
      ],
    );

    const result = await service.getRegistry();

    expect(result.rows[0]).toMatchObject({
      owner: 'CIO',
      steward: 'Interoperability Steward',
      approver: 'Operations Governance Lead',
      auditRequirement: 'required',
      reviewSchedule: 'annual',
      completeness: 'complete',
    });
  });

  it('keeps every seeded platform asset governable', async () => {
    const service = buildService(SEED_PLATFORM_ASSETS as any[], SEED_ASSET_PACKS as any[]);

    const result = await service.getRegistry();

    expect(result.summary.totalAssets).toBe(SEED_PLATFORM_ASSETS.length);
    expect(result.summary.incomplete).toBe(0);
    expect(result.rows.every((row) => row.owner && row.steward && row.approver)).toBe(true);
    expect(result.rows.every((row) => row.evidenceSource && row.version)).toBe(true);
    expect(result.rows.every((row) => row.auditRequirement && row.reviewSchedule)).toBe(true);
  });
});
