import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CommercialPlan } from '../product-catalog/entities/commercial-plan.entity';
import { IntegrationOffering } from '../product-catalog/entities/integration-offering.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationOnboardingService } from './organization-onboarding.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { SettingsFeaturesController } from './settings-features.controller';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { WhiteLabelController } from './white-label.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      Workspace,
      OrganizationMembership,
      UserProfile,
      Product,
      CommercialPlan,
      IntegrationOffering,
      Subscription,
    ]),
    PlatformAssetsModule,
    WorkspacesModule,
  ],
  controllers: [OrganizationsController, SettingsFeaturesController, WhiteLabelController],
  providers: [OrganizationsService, OrganizationOnboardingService, TenantProvisioningService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
