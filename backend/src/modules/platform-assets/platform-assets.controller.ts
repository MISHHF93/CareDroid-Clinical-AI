import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationMembership,
  OrganizationMembershipRole,
} from '../organizations/entities/organization-membership.entity';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../users/entities/user.entity';
import { DigitalTwinService } from './digital-twin.service';
import { OrganizationAnalyticsService } from './organization-analytics.service';
import { PlatformAssetLifecycle } from './enums/platform-asset.enums';
import { PlatformAssetsService } from './platform-assets.service';
import { AssetAccessService } from './asset-access.service';
import { AssetRecommendationService } from './asset-recommendation.service';
import { PlatformContextService } from './platform-context.service';

@ApiTags('platform')
@Controller('platform')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PlatformAssetsController {
  constructor(
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly platformContextService: PlatformContextService,
    private readonly assetAccessService: AssetAccessService,
    private readonly assetRecommendationService: AssetRecommendationService,
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
  async getAsset(@Param('assetId') assetId: string) {
    return this.platformAssetsService.getAssetById(assetId);
  }

  @Get('assets')
  @ApiOperation({ summary: 'List platform assets' })
  async listAssets(
    @Query('query') query?: string,
    @Query('assetType') assetType?: string,
    @Query('packId') packId?: string,
    @Query('lifecycle') lifecycle?: string,
  ) {
    return this.platformAssetsService.listAssets({ query, assetType, packId, lifecycle });
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
  @ApiOperation({ summary: 'List organization pack entitlements' })
  async orgEntitlements(@Req() req: any, @Param('organizationId') organizationId: string) {
    await this.assertOrgMember(req.user.id, organizationId);
    return this.platformAssetsService.getOrganizationEntitlements(organizationId);
  }

  @Post('organizations/:organizationId/packs/:packId/install')
  @ApiOperation({ summary: 'Enable asset pack for organization' })
  async installPack(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Param('packId') packId: string,
  ) {
    await this.assertOrgAdmin(req.user.id, organizationId);
    return this.platformAssetsService.installPackForOrganization(organizationId, packId);
  }

  @Post('organizations/:organizationId/packs/:packId/remove')
  @ApiOperation({ summary: 'Disable asset pack for organization' })
  async removePack(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Param('packId') packId: string,
  ) {
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
  @ApiOperation({ summary: 'Get hospital digital twin snapshot for active organization' })
  async digitalTwin(@Req() req: any, @Query('organizationId') organizationId?: string) {
    const ctx = await this.platformContextService.getContextForUser(req.user);
    const orgId = organizationId || ctx.organization?.id;
    if (orgId) {
      await this.assertOrgMember(req.user.id, orgId);
    }
    return this.digitalTwinService.getSnapshot(orgId);
  }

  @Get('organizations/:organizationId/analytics')
  @ApiOperation({ summary: 'Organization-scoped analytics summary' })
  async organizationAnalytics(@Req() req: any, @Param('organizationId') organizationId: string) {
    await this.assertOrgMember(req.user.id, organizationId);
    return this.organizationAnalyticsService.getOrganizationSummary(organizationId);
  }
}
