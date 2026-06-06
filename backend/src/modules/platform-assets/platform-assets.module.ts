import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AutomationAuditModule } from '../automation-audit/automation-audit.module';
import { FleetModule } from '../fleet/fleet.module';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { UsageEvent } from '../subscriptions/entities/usage-event.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AssetAccessService } from './asset-access.service';
import { AssetRecommendationService } from './asset-recommendation.service';
import { AssetRegistryService } from './asset-registry.service';
import { CustomerSuccessService } from './customer-success.service';
import { DepartmentAssetMappingService } from './department-asset-mapping.service';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { RoleProfile } from './entities/role-profile.entity';
import { DigitalTwinService } from './digital-twin.service';
import { EntitlementService } from './entitlement.service';
import { FeatureFlagService } from './feature-flag.service';
import { OrganizationAnalyticsService } from './organization-analytics.service';
import { PlatformAssetsController } from './platform-assets.controller';
import { PlatformAssetsSeedService } from './platform-assets.seed.service';
import { PlatformAssetsService } from './platform-assets.service';
import { PlatformContextService } from './platform-context.service';
import { PlatformGovernanceRegistryService } from './platform-governance-registry.service';
import { ServiceLineArchitectureService } from './service-line-architecture.service';

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
      UsageEvent,
      Product,
    ]),
    forwardRef(() => WorkspacesModule),
    AutomationAuditModule,
    UserProfileModule,
    FleetModule,
  ],
  controllers: [PlatformAssetsController],
  providers: [
    PlatformAssetsService,
    AssetRegistryService,
    FeatureFlagService,
    EntitlementService,
    PlatformAssetsSeedService,
    PlatformContextService,
    PlatformGovernanceRegistryService,
    AssetAccessService,
    AssetRecommendationService,
    DigitalTwinService,
    OrganizationAnalyticsService,
    CustomerSuccessService,
    DepartmentAssetMappingService,
    ServiceLineArchitectureService,
  ],
  exports: [
    PlatformAssetsService,
    AssetRegistryService,
    FeatureFlagService,
    EntitlementService,
    PlatformContextService,
    PlatformGovernanceRegistryService,
    AssetAccessService,
    AssetRecommendationService,
    PlatformAssetsSeedService,
  ],
})
export class PlatformAssetsModule {}
