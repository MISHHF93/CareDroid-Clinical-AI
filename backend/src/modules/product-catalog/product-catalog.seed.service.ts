import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SEED_CARE_PATHWAYS,
  SEED_COMMERCIAL_PLANS,
  SEED_INTEGRATION_OFFERINGS,
  SEED_PRODUCTS,
  SEED_SPECIALTIES,
} from './data/product-catalog-seed.data';
import { CarePathway } from './entities/care-pathway.entity';
import { CommercialPlan } from './entities/commercial-plan.entity';
import { IntegrationOffering } from './entities/integration-offering.entity';
import { Product } from './entities/product.entity';
import { SpecialtyCatalog } from './entities/specialty-catalog.entity';
import { ProductCatalogValidationService } from './product-catalog-validation.service';

@Injectable()
export class ProductCatalogSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(CommercialPlan)
    private readonly planRepository: Repository<CommercialPlan>,
    @InjectRepository(SpecialtyCatalog)
    private readonly specialtyRepository: Repository<SpecialtyCatalog>,
    @InjectRepository(CarePathway)
    private readonly pathwayRepository: Repository<CarePathway>,
    @InjectRepository(IntegrationOffering)
    private readonly integrationRepository: Repository<IntegrationOffering>,
    private readonly validationService: ProductCatalogValidationService,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    const count = await this.productRepository.count();
    if (count > 0) return;

    for (const row of SEED_PRODUCTS) {
      await this.productRepository.save(this.productRepository.create(row));
    }
    for (const row of SEED_COMMERCIAL_PLANS) {
      await this.planRepository.save(this.planRepository.create(row));
    }
    for (const row of SEED_SPECIALTIES) {
      await this.specialtyRepository.save(
        this.specialtyRepository.create({
          workflowAssetIds: [],
          dashboardAssetIds: [],
          protocolAssetIds: row.protocolAssetIds || [],
          simulationAssetIds: row.simulationAssetIds || [],
          ...row,
        }),
      );
    }
    for (const row of SEED_CARE_PATHWAYS) {
      await this.pathwayRepository.save(this.pathwayRepository.create(row));
    }
    for (const row of SEED_INTEGRATION_OFFERINGS) {
      await this.integrationRepository.save(this.integrationRepository.create(row));
    }

    await this.validationService.validateCatalogReferences();
  }
}
