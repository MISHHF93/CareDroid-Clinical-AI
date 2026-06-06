import { Injectable } from '@nestjs/common';
import { DepartmentAssetMappingService } from './department-asset-mapping.service';
import { SERVICE_LINE_TAXONOMY, serviceLineName } from './service-line-taxonomy';

type DepartmentGraph = Awaited<ReturnType<DepartmentAssetMappingService['getDepartmentGraph']>>;
type DepartmentNode = DepartmentGraph['departments'][number];

@Injectable()
export class ServiceLineArchitectureService {
  constructor(private readonly departmentAssetMappingService: DepartmentAssetMappingService) {}

  async getServiceLineGraph(params: { organizationId?: string | null } = {}) {
    const departmentGraph = await this.departmentAssetMappingService.getDepartmentGraph(params);
    const departmentById = new Map(
      departmentGraph.departments.map((department) => [department.id, department]),
    );

    const serviceLines = SERVICE_LINE_TAXONOMY.map((serviceLine) => {
      const departments = serviceLine.departmentIds
        .map((departmentId) => departmentById.get(departmentId))
        .filter(Boolean) as DepartmentNode[];
      const packs = this.rollupPacks(departments);
      const assets = this.rollupAssets(departments);

      return {
        id: serviceLine.id,
        name: serviceLine.name,
        departmentIds: serviceLine.departmentIds,
        departmentCount: departments.length,
        packCount: packs.length,
        assetCount: assets.length,
        userCount: departments.reduce((sum, department) => sum + (department.userCount || 0), 0),
        departments,
        packs,
        assets,
      };
    });

    return {
      serviceLines,
      taxonomy: SERVICE_LINE_TAXONOMY,
      generatedAt: departmentGraph.generatedAt,
    };
  }

  async getServiceLineById(serviceLineId: string, params: { organizationId?: string | null } = {}) {
    const graph = await this.getServiceLineGraph(params);
    return (
      graph.serviceLines.find((serviceLine) => serviceLine.id === serviceLineId) || {
        id: serviceLineId,
        name: serviceLineName(serviceLineId),
        departmentIds: [],
        departmentCount: 0,
        packCount: 0,
        assetCount: 0,
        userCount: 0,
        departments: [],
        packs: [],
        assets: [],
      }
    );
  }

  private rollupPacks(departments: DepartmentNode[]) {
    const packById = new Map<string, any>();
    for (const department of departments) {
      for (const pack of department.packs || []) {
        const existing = packById.get(pack.id);
        if (!existing) {
          packById.set(pack.id, { ...pack, departmentIds: [department.id] });
        } else {
          existing.assetIds = [
            ...new Set([...(existing.assetIds || []), ...(pack.assetIds || [])]),
          ];
          existing.departmentIds = [...new Set([...(existing.departmentIds || []), department.id])];
          existing.enabled = Boolean(existing.enabled || pack.enabled);
        }
      }
    }
    return [...packById.values()];
  }

  private rollupAssets(departments: DepartmentNode[]) {
    const assetById = new Map<string, any>();
    for (const department of departments) {
      for (const asset of department.assets || []) {
        const existing = assetById.get(asset.id);
        if (!existing) {
          assetById.set(asset.id, { ...asset, departmentIds: [department.id] });
        } else {
          existing.departmentIds = [...new Set([...(existing.departmentIds || []), department.id])];
          existing.packIds = [...new Set([...(existing.packIds || []), ...(asset.packIds || [])])];
          existing.enabled = Boolean(existing.enabled || asset.enabled);
        }
      }
    }
    return [...assetById.values()];
  }
}
