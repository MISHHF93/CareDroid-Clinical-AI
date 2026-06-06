import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { RoleProfile } from './entities/role-profile.entity';
import {
  DEPARTMENT_TAXONOMY,
  DepartmentId,
  departmentName,
  inferDepartmentsForAsset,
} from './department-taxonomy';
import { EntitlementStatus } from './enums/platform-asset.enums';

type DepartmentUser = {
  userId: string;
  displayName: string;
  role: string;
  roleProfileId?: string | null;
  specialty?: string | null;
};

@Injectable()
export class DepartmentAssetMappingService {
  constructor(
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
    @InjectRepository(RoleProfile)
    private readonly roleProfileRepository: Repository<RoleProfile>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(OrganizationEntitlement)
    private readonly entitlementRepository: Repository<OrganizationEntitlement>,
  ) {}

  async getDepartmentGraph(params: { organizationId?: string | null } = {}) {
    const [assets, packs, roleProfiles, users, enabledPackIds] = await Promise.all([
      this.assetRepository.find({ order: { title: 'ASC' } }),
      this.packRepository.find({ order: { name: 'ASC' } }),
      this.roleProfileRepository.find({ order: { label: 'ASC' } }),
      params.organizationId ? this.resolveDepartmentUsers(params.organizationId) : Promise.resolve([]),
      params.organizationId ? this.resolveEnabledPackIds(params.organizationId) : Promise.resolve([]),
    ]);
    const assetsByDepartment = this.groupAssetsByDepartment(assets);

    const departments = DEPARTMENT_TAXONOMY.map((department) => {
      const departmentAssets = assetsByDepartment.get(department.id) || [];
      const assetIds = new Set(departmentAssets.map((asset) => asset.id));
      const departmentPacks = packs
        .filter((pack) => (pack.assetIds || []).some((assetId) => assetIds.has(assetId)))
        .map((pack) => ({
          id: pack.id,
          name: pack.name,
          slug: pack.slug,
          description: pack.description,
          enabled: enabledPackIds.includes(pack.id),
          assetIds: (pack.assetIds || []).filter((assetId) => assetIds.has(assetId)),
          targetRoles: pack.targetRoles || [],
          defaultModules: pack.defaultModules || [],
        }));

      return {
        id: department.id,
        name: department.name,
        assetCount: departmentAssets.length,
        packCount: departmentPacks.length,
        userCount: users.filter((user) => this.userMatchesDepartment(user, department.id, roleProfiles)).length,
        packs: departmentPacks,
        assets: departmentAssets.map((asset) => this.serializeDepartmentAsset(asset, enabledPackIds)),
        users: users.filter((user) => this.userMatchesDepartment(user, department.id, roleProfiles)),
      };
    });

    return {
      departments,
      taxonomy: DEPARTMENT_TAXONOMY,
      generatedAt: new Date().toISOString(),
    };
  }

  async getDepartmentById(departmentId: string, params: { organizationId?: string | null } = {}) {
    const graph = await this.getDepartmentGraph(params);
    return graph.departments.find((department) => department.id === departmentId) || {
      id: departmentId,
      name: departmentName(departmentId),
      assetCount: 0,
      packCount: 0,
      userCount: 0,
      packs: [],
      assets: [],
      users: [],
    };
  }

  private groupAssetsByDepartment(assets: PlatformAsset[]) {
    const map = new Map<DepartmentId, PlatformAsset[]>();
    for (const asset of assets) {
      const departments = this.departmentsForAsset(asset);
      for (const department of departments) {
        map.set(department, [...(map.get(department) || []), asset]);
      }
    }
    return map;
  }

  private serializeDepartmentAsset(asset: PlatformAsset, enabledPackIds: string[]) {
    const inferred = inferDepartmentsForAsset(asset);
    const primaryDepartment = asset.primaryDepartment || inferred.primaryDepartment;
    const secondaryDepartments = asset.secondaryDepartments?.length
      ? asset.secondaryDepartments
      : inferred.secondaryDepartments;
    return {
      id: asset.id,
      title: asset.title,
      description: asset.description,
      assetType: asset.assetType,
      category: asset.category,
      route: asset.route,
      primaryDepartment,
      secondaryDepartments,
      recommendedRoles: asset.recommendedRoles || asset.intendedRoles || [],
      requiredPermissions: asset.requiredPermissions || [],
      packIds: asset.packIds || [],
      enabled: (asset.packIds || []).some((packId) => enabledPackIds.includes(packId)),
    };
  }

  private departmentsForAsset(asset: PlatformAsset): DepartmentId[] {
    const inferred = inferDepartmentsForAsset(asset);
    return [
      asset.primaryDepartment || inferred.primaryDepartment,
      ...((asset.secondaryDepartments?.length ? asset.secondaryDepartments : inferred.secondaryDepartments) || []),
    ].filter(Boolean) as DepartmentId[];
  }

  private async resolveEnabledPackIds(organizationId: string) {
    const rows = await this.entitlementRepository.find({
      where: { organizationId, status: EntitlementStatus.ENABLED },
    });
    return rows.map((row) => row.packId);
  }

  private async resolveDepartmentUsers(organizationId: string): Promise<DepartmentUser[]> {
    const memberships = await this.membershipRepository.find({ where: { organizationId } });
    if (!memberships.length) return [];
    const profiles = await this.profileRepository.find({
      where: { userId: In(memberships.map((membership) => membership.userId)) },
    });
    const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));

    return memberships.map((membership) => {
      const profile = profileByUserId.get(membership.userId);
      return {
        userId: membership.userId,
        displayName: profile?.fullName || membership.userId,
        role: membership.role,
        roleProfileId: membership.roleProfileId || profile?.roleProfileId,
        specialty: profile?.specialty,
      };
    });
  }

  private userMatchesDepartment(
    user: DepartmentUser,
    departmentId: DepartmentId,
    roleProfiles: RoleProfile[],
  ) {
    const roleProfile = user.roleProfileId
      ? roleProfiles.find((profile) => profile.id === user.roleProfileId)
      : null;
    const text = [
      user.role,
      user.specialty,
      roleProfile?.label,
      ...(roleProfile?.intendedRoles || []),
      ...(roleProfile?.specialties || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const department = departmentName(departmentId).toLowerCase();
    return text.includes(department.toLowerCase()) || text.includes(departmentId.replace(/-/g, ' '));
  }
}
