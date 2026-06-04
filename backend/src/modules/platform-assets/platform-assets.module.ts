import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { FleetModule } from '../fleet/fleet.module';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AssetAccessService } from './asset-access.service';
import { AssetRecommendationService } from './asset-recommendation.service';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { RoleProfile } from './entities/role-profile.entity';
import { DigitalTwinService } from './digital-twin.service';
import { OrganizationAnalyticsService } from './organization-analytics.service';
import { PlatformAssetsController } from './platform-assets.controller';
import { PlatformAssetsSeedService } from './platform-assets.seed.service';
import { PlatformAssetsService } from './platform-assets.service';
import { PlatformContextService } from './platform-context.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformAsset,
      AssetPack,
      OrganizationEntitlement,
      RoleProfile,
      Organization,
      OrganizationMembership,
      UserProfile,
      AuditLog,
    ]),
    WorkspacesModule,
    UserProfileModule,
    FleetModule,
  ],
  controllers: [PlatformAssetsController],
  providers: [
    PlatformAssetsService,
    PlatformAssetsSeedService,
    PlatformContextService,
    AssetAccessService,
    AssetRecommendationService,
    DigitalTwinService,
    OrganizationAnalyticsService,
  ],
  exports: [
    PlatformAssetsService,
    PlatformContextService,
    AssetAccessService,
    AssetRecommendationService,
    PlatformAssetsSeedService,
  ],
})
export class PlatformAssetsModule {}
