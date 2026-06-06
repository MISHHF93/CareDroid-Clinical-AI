import { DepartmentAssetMappingService } from './department-asset-mapping.service';
import { DEPARTMENT_IDS } from './department-taxonomy';
import { ServiceLineArchitectureService } from './service-line-architecture.service';
import { SERVICE_LINE_TAXONOMY, validateServiceLineDepartments } from './service-line-taxonomy';

describe('ServiceLineArchitectureService', () => {
  const departmentAssetMappingService = {
    getDepartmentGraph: jest.fn(),
  };
  let service: ServiceLineArchitectureService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServiceLineArchitectureService(
      departmentAssetMappingService as unknown as DepartmentAssetMappingService,
    );
    departmentAssetMappingService.getDepartmentGraph.mockResolvedValue({
      generatedAt: '2026-06-06T00:00:00.000Z',
      taxonomy: [],
      departments: [
        {
          id: 'emergency',
          name: 'Emergency',
          assetCount: 1,
          packCount: 1,
          userCount: 1,
          packs: [
            {
              id: 'emergency-department-pack',
              name: 'Emergency Department Pack',
              assetIds: ['qsofa'],
              enabled: true,
            },
          ],
          assets: [
            {
              id: 'qsofa',
              title: 'qSOFA',
              assetType: 'calculator',
              route: '/tools/calculators/qsofa',
              packIds: ['emergency-department-pack'],
              enabled: true,
            },
          ],
          users: [{ userId: 'user-1' }],
        },
        {
          id: 'icu',
          name: 'ICU',
          assetCount: 1,
          packCount: 1,
          userCount: 0,
          packs: [{ id: 'icu-pack', name: 'ICU Pack', assetIds: ['sofa-score'] }],
          assets: [
            {
              id: 'sofa-score',
              title: 'SOFA Score',
              assetType: 'calculator',
              packIds: ['icu-pack'],
            },
          ],
          users: [],
        },
        {
          id: 'respiratory-therapy',
          name: 'Respiratory Therapy',
          assetCount: 0,
          packCount: 0,
          userCount: 0,
          packs: [],
          assets: [],
          users: [],
        },
        {
          id: 'pharmacy',
          name: 'Pharmacy',
          assetCount: 0,
          packCount: 0,
          userCount: 0,
          packs: [],
          assets: [],
          users: [],
        },
      ],
    });
  });

  it('defines the ten required service lines and maps only canonical departments', () => {
    expect(SERVICE_LINE_TAXONOMY.map((serviceLine) => serviceLine.name)).toEqual([
      'Emergency Medicine',
      'Critical Care',
      'Cardiology',
      'Neurology',
      'Pediatrics',
      'Surgery',
      'Laboratory Medicine',
      'Operations',
      'Education',
      'Research',
    ]);
    expect(validateServiceLineDepartments()).toEqual([]);
    SERVICE_LINE_TAXONOMY.flatMap((serviceLine) => serviceLine.departmentIds).forEach(
      (departmentId) => {
        expect(DEPARTMENT_IDS).toContain(departmentId);
      },
    );
  });

  it('rolls departments into service-line packs and assets', async () => {
    const graph = await service.getServiceLineGraph({ organizationId: 'org-1' });
    const emergency = graph.serviceLines.find(
      (serviceLine) => serviceLine.id === 'emergency-medicine',
    );
    const criticalCare = graph.serviceLines.find(
      (serviceLine) => serviceLine.id === 'critical-care',
    );

    expect(departmentAssetMappingService.getDepartmentGraph).toHaveBeenCalledWith({
      organizationId: 'org-1',
    });
    expect(emergency).toMatchObject({
      name: 'Emergency Medicine',
      departmentCount: 1,
      packCount: 1,
      assetCount: 1,
      userCount: 1,
    });
    expect(emergency?.packs).toEqual([
      expect.objectContaining({
        id: 'emergency-department-pack',
        departmentIds: ['emergency'],
      }),
    ]);
    expect(emergency?.assets).toEqual([
      expect.objectContaining({
        id: 'qsofa',
        departmentIds: ['emergency'],
      }),
    ]);
    expect(criticalCare?.departments.map((department) => department.id)).toEqual([
      'icu',
      'respiratory-therapy',
      'pharmacy',
    ]);
    expect(criticalCare?.assets).toEqual([expect.objectContaining({ id: 'sofa-score' })]);
  });
});
