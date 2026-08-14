import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { hasPermission } from '../auth/config/role-permissions.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationMembership,
  OrganizationMembershipRole,
} from '../organizations/entities/organization-membership.entity';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../auth/enums/permission.enum';
import { TenantIsolationGuard } from '../tenant-context/tenant-isolation.guard';
import { OrganizationScoped, TenantScoped } from '../tenant-context/tenant-scope.decorator';
import { UserRole } from '../users/entities/user.entity';
import { DigitalTwinService } from './digital-twin.service';
import { OrganizationAnalyticsService } from './organization-analytics.service';
import { PlatformAssetLifecycle } from './enums/platform-asset.enums';
import { PlatformAssetsService } from './platform-assets.service';
import { AssetAccessService } from './asset-access.service';
import { AssetRecommendationService } from './asset-recommendation.service';
import { CustomerSuccessService } from './customer-success.service';
import { DepartmentAssetMappingService } from './department-asset-mapping.service';
import { PlatformContextService } from './platform-context.service';
import { PlatformGovernanceRegistryService } from './platform-governance-registry.service';
import { ServiceLineArchitectureService } from './service-line-architecture.service';

@ApiTags('platform')
@Controller('platform')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
@TenantScoped()
@ApiBearerAuth()
export class PlatformAssetsController {
  constructor(
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly platformContextService: PlatformContextService,
    private readonly assetAccessService: AssetAccessService,
    private readonly assetRecommendationService: AssetRecommendationService,
    private readonly customerSuccessService: CustomerSuccessService,
    private readonly departmentAssetMappingService: DepartmentAssetMappingService,
    private readonly serviceLineArchitectureService: ServiceLineArchitectureService,
    private readonly platformGovernanceRegistryService: PlatformGovernanceRegistryService,
    private readonly digitalTwinService: DigitalTwinService,
    private readonly organizationAnalyticsService: OrganizationAnalyticsService,
  ) {}

  @Get('context')
  @ApiOperation({ summary: 'Get platform context: org, entitlements, role profile, AI agents' })
  async context(@Req() req: any) {
    return this.platformContextService.getContextForUser(req.user);
  }

  @Patch('me/role-profile')
  @ApiOperation({ summary: 'Set current user role profile' })
  async setRoleProfile(@Req() req: any, @Body('roleProfileId') roleProfileId: string) {
    // roleProfileId drives real AuthorizationGuard permission grants
    // (hasSaasProfilePermission, e.g. READ_PHI/WRITE_PHI/EXPORT_PHI for
    // 'emergency-physician') -- self-assignment must be gated the same way
    // UserProfileController.update() gates dto.role, or any authenticated
    // account (including UserRole.STUDENT) could grant itself full PHI
    // access with no admin involvement.
    const canAssignRole =
      req.user?.role === UserRole.ADMIN ||
      hasPermission(req.user?.role, Permission.MANAGE_ROLES) ||
      hasPermission(req.user?.role, Permission.MANAGE_USERS);
    if (!canAssignRole) {
      throw new ForbiddenException('Role profile assignment is managed by your organization administrator.');
    }
    return this.platformAssetsService.updateUserRoleProfile(req.user.id, roleProfileId);
  }

  @Get('users/me/assets')
  @ApiOperation({ summary: 'Current user asset access projection' })
  async myAssets(@Req() req: any) {
    return this.assetAccessService.getUserAssetAccess(req.user);
  }

  @Get('users/me/recommendations')
  @ApiOperation({ summary: 'Role and workspace aware asset recommendations' })
  async myRecommendations(@Req() req: any, @Query('limit') limit?: string) {
    return this.assetRecommendationService.getRecommendationsForUser(
      req.user,
      limit ? parseInt(limit, 10) : 12,
    );
  }

  @Post('users/me/pinned-assets')
  @ApiOperation({ summary: 'Update pinned platform assets' })
  async pinAssets(@Req() req: any, @Body('assetIds') assetIds: string[]) {
    return this.platformAssetsService.updateUserPinnedAssets(req.user.id, assetIds || []);
  }

  @Post('users/me/hidden-assets')
  @ApiOperation({ summary: 'Update hidden platform assets' })
  async hideAssets(@Req() req: any, @Body('assetIds') assetIds: string[]) {
    return this.platformAssetsService.updateUserHiddenAssets(req.user.id, assetIds || []);
  }

  @Get('assets/:assetId')
  @ApiOperation({ summary: 'Get platform asset by id' })
  async getAsset(@Req() req: any, @Param('assetId') assetId: string) {
    const [asset, ctx] = await Promise.all([
      this.platformAssetsService.getAssetById(assetId),
      this.platformContextService.getContextForUser(req.user),
    ]);
    if (!this.isEntitledAsset(asset, ctx)) {
      throw new NotFoundException(`Asset not found: ${assetId}`);
    }
    return asset;
  }

  @Get('assets')
  @ApiOperation({ summary: 'List platform assets' })
  async listAssets(
    @Req() req: any,
    @Query('query') query?: string,
    @Query('assetType') assetType?: string,
    @Query('packId') packId?: string,
    @Query('lifecycle') lifecycle?: string,
  ) {
    const [assets, ctx] = await Promise.all([
      this.platformAssetsService.listAssets({ query, assetType, packId, lifecycle }),
      this.platformContextService.getContextForUser(req.user),
    ]);
    return assets.filter((asset) => this.isEntitledAsset(asset, ctx));
  }

  @Get('governance-registry')
  @TenantScoped({ permissions: [Permission.VIEW_GOVERNANCE] })
  @ApiOperation({ summary: 'Platform asset governance registry' })
  async governanceRegistry(
    @Query('query') query?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('owner') owner?: string,
    @Query('assetType') assetType?: string,
  ) {
    return this.platformGovernanceRegistryService.getRegistry({
      query,
      riskLevel,
      owner,
      assetType,
    });
  }

  @Get('departments')
  @ApiOperation({ summary: 'List department-to-asset mappings' })
  async departments(@Req() req: any, @Query('organizationId') organizationId?: string) {
    const orgId = organizationId || req.tenantContext?.organizationId;
    if (orgId) {
      this.assertTenantOrganization(req, orgId);
      await this.assertOrgMember(req.user.id, orgId);
    }
    return this.departmentAssetMappingService.getDepartmentGraph({ organizationId: orgId });
  }

  @Get('departments/:departmentId')
  @ApiOperation({ summary: 'Get a department asset mapping' })
  async department(
    @Req() req: any,
    @Param('departmentId') departmentId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId = organizationId || req.tenantContext?.organizationId;
    if (orgId) {
      this.assertTenantOrganization(req, orgId);
      await this.assertOrgMember(req.user.id, orgId);
    }
    return this.departmentAssetMappingService.getDepartmentById(departmentId, {
      organizationId: orgId,
    });
  }

  @Get('service-lines')
  @ApiOperation({ summary: 'List service-line architecture mappings' })
  async serviceLines(@Req() req: any, @Query('organizationId') organizationId?: string) {
    const orgId = organizationId || req.tenantContext?.organizationId;
    if (orgId) {
      this.assertTenantOrganization(req, orgId);
      await this.assertOrgMember(req.user.id, orgId);
    }
    return this.serviceLineArchitectureService.getServiceLineGraph({ organizationId: orgId });
  }

  @Get('service-lines/:serviceLineId')
  @ApiOperation({ summary: 'Get a service-line architecture mapping' })
  async serviceLine(
    @Req() req: any,
    @Param('serviceLineId') serviceLineId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId = organizationId || req.tenantContext?.organizationId;
    if (orgId) {
      this.assertTenantOrganization(req, orgId);
      await this.assertOrgMember(req.user.id, orgId);
    }
    return this.serviceLineArchitectureService.getServiceLineById(serviceLineId, {
      organizationId: orgId,
    });
  }

  @Get('packs')
  @ApiOperation({ summary: 'List asset packs (solution packs)' })
  async listPacks(
    @Query('organizationType') organizationType?: string,
    @Query('publishedOnly') publishedOnly?: string,
  ) {
    return this.platformAssetsService.listPacks({
      organizationType,
      publishedOnly: publishedOnly !== 'false',
    });
  }

  @Get('marketplace/packs')
  @OrganizationScoped()
  @ApiOperation({ summary: 'List asset packs with organization marketplace state' })
  async marketplacePacks(
    @Req() req: any,
    @Query('organizationId') organizationId?: string,
    @Query('organizationType') organizationType?: string,
    @Query('publishedOnly') publishedOnly?: string,
  ) {
    const orgId = organizationId || req.tenantContext?.organizationId;
    if (orgId) {
      this.assertTenantOrganization(req, orgId);
      await this.assertOrgMember(req.user.id, orgId);
    }
    return this.platformAssetsService.listMarketplacePacks({
      organizationId: orgId,
      organizationType,
      publishedOnly: publishedOnly !== 'false',
    });
  }

  @Get('marketplace/packs/:packId')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get asset pack marketplace details' })
  async marketplacePack(
    @Req() req: any,
    @Param('packId') packId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId = organizationId || req.tenantContext?.organizationId;
    if (orgId) {
      this.assertTenantOrganization(req, orgId);
      await this.assertOrgMember(req.user.id, orgId);
    }
    return this.platformAssetsService.getMarketplacePack(packId, { organizationId: orgId });
  }

  @Get('packs/:packId')
  @ApiOperation({ summary: 'Get asset pack by id' })
  async getPack(@Param('packId') packId: string) {
    return this.platformAssetsService.getPack(packId);
  }

  @Get('role-profiles')
  @ApiOperation({ summary: 'List role profiles' })
  async listRoleProfiles() {
    return this.platformAssetsService.listRoleProfiles();
  }

  @Get('role-profiles/:id')
  @ApiOperation({ summary: 'Get role profile by id' })
  async getRoleProfile(@Param('id') id: string) {
    return this.platformAssetsService.getRoleProfile(id);
  }

  @Get('organizations/:organizationId/entitlements')
  @OrganizationScoped()
  @ApiOperation({ summary: 'List organization pack entitlements' })
  async orgEntitlements(@Req() req: any, @Param('organizationId') organizationId: string) {
    this.assertTenantOrganization(req, organizationId);
    await this.assertOrgMember(req.user.id, organizationId);
    return this.platformAssetsService.getOrganizationEntitlements(organizationId);
  }

  @Post('organizations/:organizationId/packs/:packId/install')
  @OrganizationScoped({ admin: 'organization' })
  @ApiOperation({ summary: 'Enable asset pack for organization' })
  async installPack(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Param('packId') packId: string,
  ) {
    this.assertTenantOrganization(req, organizationId);
    await this.assertOrgAdmin(req.user.id, organizationId);
    return this.platformAssetsService.installPackForOrganization(organizationId, packId);
  }

  @Post('organizations/:organizationId/packs/:packId/remove')
  @OrganizationScoped({ admin: 'organization' })
  @ApiOperation({ summary: 'Disable asset pack for organization' })
  async removePack(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Param('packId') packId: string,
  ) {
    this.assertTenantOrganization(req, organizationId);
    await this.assertOrgAdmin(req.user.id, organizationId);
    return this.platformAssetsService.removePackFromOrganization(organizationId, packId);
  }

  private async assertOrgAdmin(userId: string, organizationId: string) {
    const membership = await this.assertOrgMember(userId, organizationId);
    if (
      membership.role !== OrganizationMembershipRole.ADMIN &&
      membership.role !== OrganizationMembershipRole.OWNER
    ) {
      throw new ForbiddenException('Organization admin access required');
    }
  }

  private async assertOrgMember(userId: string, organizationId: string) {
    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId },
    });
    if (!membership) {
      throw new ForbiddenException('Organization membership required');
    }
    return membership;
  }

  @Patch('assets/:assetId/lifecycle')
  @TenantScoped({ admin: 'any', permissions: [Permission.CONFIGURE_SYSTEM] })
  @ApiOperation({ summary: 'Update platform asset lifecycle state' })
  async updateLifecycle(
    @Req() req: any,
    @Param('assetId') assetId: string,
    @Body('lifecycle') lifecycle: PlatformAssetLifecycle,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Platform admin access required');
    }
    return this.platformAssetsService.updateAssetLifecycle(assetId, lifecycle);
  }

  @Get('digital-twin')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get hospital digital twin snapshot for active organization' })
  async digitalTwin(@Req() req: any, @Query('organizationId') organizationId?: string) {
    const ctx = await this.platformContextService.getContextForUser(req.user);
    const orgId = organizationId || ctx.organization?.id;
    if (orgId) {
      this.assertTenantOrganization(req, orgId);
      await this.assertOrgMember(req.user.id, orgId);
    }
    return this.digitalTwinService.getSnapshot(orgId);
  }

  @Get('organizations/:organizationId/analytics')
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.VIEW_ANALYTICS] })
  @ApiOperation({ summary: 'Organization-scoped analytics summary' })
  async organizationAnalytics(@Req() req: any, @Param('organizationId') organizationId: string) {
    this.assertTenantOrganization(req, organizationId);
    await this.assertOrgMember(req.user.id, organizationId);
    return this.organizationAnalyticsService.getOrganizationSummary(organizationId);
  }

  @Get('organizations/:organizationId/customer-success')
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.VIEW_ANALYTICS] })
  @ApiOperation({ summary: 'Customer success health and retention dashboard' })
  async customerSuccess(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Query('period') period?: string,
  ) {
    this.assertTenantOrganization(req, organizationId);
    await this.assertOrgMember(req.user.id, organizationId);
    return this.customerSuccessService.getCustomerSuccessDashboard(organizationId, period);
  }

  private assertTenantOrganization(req: any, organizationId: string) {
    if (req.tenantContext?.organizationId && req.tenantContext.organizationId !== organizationId) {
      throw new ForbiddenException('Requested organization does not match tenant context.');
    }
  }

  private isEntitledAsset(asset: { id: string }, ctx: any) {
    const entitledAssetIds = new Set(ctx?.entitledAssetIds || []);
    const decision = ctx?.assetAccessDecisions?.[asset.id];
    return entitledAssetIds.has(asset.id) && decision?.isLaunchable === true;
  }
}
