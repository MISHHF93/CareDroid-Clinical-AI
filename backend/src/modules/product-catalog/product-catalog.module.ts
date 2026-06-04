import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { Organization } from '../workspaces/entities/organization.entity';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { OrganizationEntitlement } from '../platform-assets/entities/organization-entitlement.entity';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { CarePathway } from './entities/care-pathway.entity';
import { CommercialPlan } from './entities/commercial-plan.entity';
import { IntegrationOffering } from './entities/integration-offering.entity';
import { Product } from './entities/product.entity';
import { SpecialtyCatalog } from './entities/specialty-catalog.entity';
import { MaturityAssessmentService } from './maturity-assessment.service';
import { OutcomesService } from './outcomes.service';
import { ProductCatalogController } from './product-catalog.controller';
import { ProductCatalogSeedService } from './product-catalog.seed.service';
import { ProductCatalogService } from './product-catalog.service';
import { ProductCatalogValidationService } from './product-catalog-validation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      CommercialPlan,
      SpecialtyCatalog,
      CarePathway,
      IntegrationOffering,
      Organization,
      PlatformAsset,
      AssetPack,
      OrganizationEntitlement,
      AuditLog,
    ]),
    PlatformAssetsModule,
    OrganizationsModule,
  ],
  controllers: [ProductCatalogController],
  providers: [
    ProductCatalogService,
    ProductCatalogSeedService,
    ProductCatalogValidationService,
    MaturityAssessmentService,
    OutcomesService,
  ],
  exports: [ProductCatalogService, OutcomesService],
})
export class ProductCatalogModule {}
