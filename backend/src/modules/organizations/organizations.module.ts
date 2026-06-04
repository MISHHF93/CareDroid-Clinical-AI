import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CommercialPlan } from '../product-catalog/entities/commercial-plan.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationOnboardingService } from './organization-onboarding.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMembership,
      UserProfile,
      Product,
      CommercialPlan,
    ]),
    PlatformAssetsModule,
    WorkspacesModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationOnboardingService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
