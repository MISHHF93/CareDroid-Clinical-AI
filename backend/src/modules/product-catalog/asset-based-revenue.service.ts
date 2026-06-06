import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { PricingTier } from '../platform-assets/enums/platform-asset.enums';
import {
  DepartmentId,
  departmentName,
  inferDepartmentsForAsset,
} from '../platform-assets/department-taxonomy';
import {
  SERVICE_LINE_TAXONOMY,
  serviceLineName,
} from '../platform-assets/service-line-taxonomy';
import { CommercialPlan } from './entities/commercial-plan.entity';
import { IntegrationOffering } from './entities/integration-offering.entity';
import { Product } from './entities/product.entity';

type CatalogProduct = Partial<Product> & {
  id: string;
  name: string;
  slug?: string;
  packIds?: string[];
  highlightAssetIds?: string[];
  outcomes?: string[];
  expectedOutcomes?: string[];
  targetBuyers?: string[];
  buyerPersona?: string[];
  requiredIntegrations?: string[];
  commercialPlanIds?: string[];
};

type CatalogPack = Partial<AssetPack> & {
  id: string;
  name: string;
  slug?: string;
  assetIds?: string[];
  organizationTypes?: string[];
  targetRoles?: string[];
  buyerPersona?: string[];
  decisionMaker?: string[];
  stakeholders?: string[];
  expectedOutcomes?: string[];
  pricingTier?: PricingTier | string;
};

type CatalogAsset = Partial<PlatformAsset> & {
  id: string;
  title: string;
  category?: string;
  packIds?: string[];
  primaryDepartment?: string;
  secondaryDepartments?: string[];
  recommendedRoles?: string[];
  intendedRoles?: string[];
  organizationTypes?: string[];
};

type CatalogPlan = Partial<CommercialPlan> & {
  id: string;
  includedProductIds?: string[];
  includedPackIds?: string[];
  pricingTier?: PricingTier | string;
};

type CatalogIntegration = Partial<IntegrationOffering> & {
  id: string;
  slug?: string;
  name: string;
  linkedAssetId?: string;
};

export type AssetRevenueMatrixRow = {
  hospitalType: string;
  serviceLine: string;
  department: string;
  productId: string;
  product: string;
  assetPackId: string;
  assetPack: string;
  assetId: string;
  asset: string;
  category: string;
  buyer: string[];
  roles: string[];
  integrations: string[];
  outcomes: string[];
  subscriptionTiers: string[];
  pricingTier: string;
};

export type AssetRevenueValidationIssue = {
  type:
    | 'asset-missing-pack'
    | 'pack-missing-product'
    | 'row-missing-commercial-field'
    | 'unknown-pack'
    | 'unknown-asset';
  assetId?: string;
  packId?: string;
  field?: string;
  message: string;
};

const CORE_PLATFORM_PRODUCT: CatalogProduct = {
  id: 'product-core-platform',
  slug: 'core-platform-foundation',
  name: 'Core Platform Foundation',
  packIds: ['core-platform'],
  outcomes: ['core platform adoption', 'standardized access to clinical tools'],
  expectedOutcomes: ['core platform adoption', 'standardized access to clinical tools'],
  buyerPersona: ['Chief Medical Officer', 'CIO', 'Clinical Operations Leader'],
  targetBuyers: ['Chief Medical Officer', 'CIO', 'Clinical Operations Leader'],
  requiredIntegrations: ['Identity providers', 'FHIR/HL7 when clinical context is enabled'],
  commercialPlanIds: ['starter', 'professional', 'enterprise', 'academic', 'government'],
};

const AI_WORKFLOW_PRODUCT: CatalogProduct = {
  id: 'product-ai-workflow',
  slug: 'ai-workflow-suite',
  name: 'AI Workflow Automation Suite',
  packIds: ['ai-workflow-pack'],
  outcomes: ['clinical workflow automation', 'documentation efficiency'],
  expectedOutcomes: ['clinical workflow automation', 'documentation efficiency'],
  buyerPersona: ['Chief Medical Information Officer', 'Clinical Informatics Director'],
  targetBuyers: ['Chief Medical Information Officer', 'Chief Medical Officer'],
  requiredIntegrations: ['EHR patient context', 'SSO/IAM', 'Audit logging'],
  commercialPlanIds: ['enterprise'],
};

@Injectable()
export class AssetBasedRevenueService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
    @InjectRepository(CommercialPlan)
    private readonly planRepository: Repository<CommercialPlan>,
    @InjectRepository(IntegrationOffering)
    private readonly integrationRepository: Repository<IntegrationOffering>,
  ) {}

  async getRevenueArchitectureMatrix() {
    const [products, packs, assets, plans, integrations] = await Promise.all([
      this.productRepository.find({ order: { sortOrder: 'ASC' } }),
      this.packRepository.find({ order: { name: 'ASC' } }),
      this.assetRepository.find({ order: { title: 'ASC' } }),
      this.planRepository.find({ order: { sortOrder: 'ASC' } }),
      this.integrationRepository.find({ order: { sortOrder: 'ASC' } }),
    ]);

    return AssetBasedRevenueService.buildRevenueArchitectureMatrix({
      products,
      packs,
      assets,
      plans,
      integrations,
    });
  }

  static buildRevenueArchitectureMatrix(input: {
    products: CatalogProduct[];
    packs: CatalogPack[];
    assets: CatalogAsset[];
    plans: CatalogPlan[];
    integrations?: CatalogIntegration[];
  }) {
    const products = [CORE_PLATFORM_PRODUCT, AI_WORKFLOW_PRODUCT, ...input.products];
    const packById = new Map(input.packs.map((pack) => [pack.id, pack]));
    const assetById = new Map(input.assets.map((asset) => [asset.id, asset]));
    const integrations = input.integrations || [];
    const productByPack = this.productLookupByPack(products);
    const rows: AssetRevenueMatrixRow[] = [];
    const issues: AssetRevenueValidationIssue[] = [];

    for (const pack of input.packs) {
      const packProducts = productByPack.get(pack.id) || [];
      if (!packProducts.length) {
        issues.push({
          type: 'pack-missing-product',
          packId: pack.id,
          message: `${pack.id} is not linked to a product or core platform product.`,
        });
      }

      for (const assetId of pack.assetIds || []) {
        const asset = assetById.get(assetId);
        if (!asset) {
          issues.push({
            type: 'unknown-asset',
            packId: pack.id,
            assetId,
            message: `${pack.id} references missing asset ${assetId}.`,
          });
          continue;
        }

        const departments = this.departmentsForAsset(asset);
        const productsForAsset = this.productsForAsset(pack, asset, products, productByPack);
        for (const product of productsForAsset) {
          for (const departmentId of departments) {
            const serviceLines = this.serviceLinesForDepartment(departmentId);
            for (const serviceLineId of serviceLines) {
              rows.push(
                this.buildRow({
                  product,
                  pack,
                  asset,
                  departmentId,
                  serviceLineId,
                  plans: input.plans,
                  integrations,
                }),
              );
            }
          }
        }
      }
    }

    for (const asset of input.assets) {
      const packIds = asset.packIds || [];
      if (!packIds.length) {
        issues.push({
          type: 'asset-missing-pack',
          assetId: asset.id,
          message: `${asset.id} is not assigned to any asset pack.`,
        });
      }
      for (const packId of packIds) {
        if (!packById.has(packId)) {
          issues.push({
            type: 'unknown-pack',
            assetId: asset.id,
            packId,
            message: `${asset.id} references missing pack ${packId}.`,
          });
        }
      }
    }

    const rowIssues = rows.flatMap((row) => this.validateRow(row));

    return {
      hierarchy: 'Organization -> Subscription -> Products -> Asset Packs -> Assets',
      summary: {
        hospitalTypes: new Set(rows.map((row) => row.hospitalType)).size,
        serviceLines: new Set(rows.map((row) => row.serviceLine)).size,
        departments: new Set(rows.map((row) => row.department)).size,
        products: new Set(rows.map((row) => row.productId)).size,
        assetPacks: new Set(rows.map((row) => row.assetPackId)).size,
        assets: new Set(rows.map((row) => row.assetId)).size,
        rows: rows.length,
        validationIssues: issues.length + rowIssues.length,
      },
      rows: rows.sort((a, b) =>
        [
          a.hospitalType.localeCompare(b.hospitalType),
          a.serviceLine.localeCompare(b.serviceLine),
          a.department.localeCompare(b.department),
          a.product.localeCompare(b.product),
          a.assetPack.localeCompare(b.assetPack),
          a.asset.localeCompare(b.asset),
        ].find((value) => value !== 0) || 0,
      ),
      validationIssues: [...issues, ...rowIssues],
    };
  }

  private static productLookupByPack(products: CatalogProduct[]) {
    const productByPack = new Map<string, CatalogProduct[]>();
    for (const product of products) {
      for (const packId of product.packIds || []) {
        productByPack.set(packId, [...(productByPack.get(packId) || []), product]);
      }
    }
    return productByPack;
  }

  private static productsForAsset(
    pack: CatalogPack,
    asset: CatalogAsset,
    products: CatalogProduct[],
    productByPack: Map<string, CatalogProduct[]>,
  ) {
    const candidates = [
      ...(productByPack.get(pack.id) || []),
      ...products.filter((product) => (product.highlightAssetIds || []).includes(asset.id)),
    ];
    return this.uniqueBy(candidates.length ? candidates : [CORE_PLATFORM_PRODUCT], (product) => product.id);
  }

  private static buildRow(input: {
    product: CatalogProduct;
    pack: CatalogPack;
    asset: CatalogAsset;
    departmentId: string;
    serviceLineId: string;
    plans: CatalogPlan[];
    integrations: CatalogIntegration[];
  }): AssetRevenueMatrixRow {
    const productOutcomes = input.product.expectedOutcomes?.length
      ? input.product.expectedOutcomes
      : input.product.outcomes || [];
    const packOutcomes = input.pack.expectedOutcomes || [];
    const buyer = this.unique([
      ...(input.pack.buyerPersona || []),
      ...(input.product.buyerPersona || []),
      ...(input.product.targetBuyers || []),
    ]);
    const roles = this.unique([
      ...(input.asset.recommendedRoles || []),
      ...(input.asset.intendedRoles || []),
      ...(input.pack.targetRoles || []),
    ]);
    const planIds = this.resolveSubscriptionTiers(input.product, input.pack, input.plans);
    const linkedIntegrations = input.integrations
      .filter((integration) => integration.linkedAssetId === input.asset.id)
      .map((integration) => integration.name || integration.slug || integration.id);

    return {
      hospitalType: this.titleize(
        (input.pack.organizationTypes?.[0] || input.asset.organizationTypes?.[0] || 'hospital') as string,
      ),
      serviceLine: serviceLineName(input.serviceLineId),
      department: departmentName(input.departmentId),
      productId: input.product.id,
      product: input.product.name,
      assetPackId: input.pack.id,
      assetPack: input.pack.name,
      assetId: input.asset.id,
      asset: input.asset.title,
      category: input.asset.category || input.pack.name,
      buyer,
      roles,
      integrations: this.unique([...(input.product.requiredIntegrations || []), ...linkedIntegrations]),
      outcomes: this.unique([...productOutcomes, ...packOutcomes]),
      subscriptionTiers: planIds,
      pricingTier: String(input.pack.pricingTier || input.asset.pricingTier || PricingTier.STANDARD),
    };
  }

  private static resolveSubscriptionTiers(
    product: CatalogProduct,
    pack: CatalogPack,
    plans: CatalogPlan[],
  ) {
    return this.unique([
      ...(product.commercialPlanIds || []),
      ...plans
        .filter(
          (plan) =>
            (plan.includedProductIds || []).includes(product.id) ||
            (plan.includedPackIds || []).includes(pack.id),
        )
        .map((plan) => plan.id),
    ]);
  }

  private static departmentsForAsset(asset: CatalogAsset) {
    const inferred = inferDepartmentsForAsset(asset as PlatformAsset);
    return this.unique([
      asset.primaryDepartment || inferred.primaryDepartment,
      ...((asset.secondaryDepartments?.length ? asset.secondaryDepartments : inferred.secondaryDepartments) || []),
    ]).filter(Boolean) as DepartmentId[];
  }

  private static serviceLinesForDepartment(departmentId: string) {
    const serviceLines = SERVICE_LINE_TAXONOMY.filter((serviceLine) =>
      (serviceLine.departmentIds as readonly string[]).includes(departmentId),
    ).map((serviceLine) => serviceLine.id);
    return serviceLines.length ? serviceLines : ['operations'];
  }

  private static validateRow(row: AssetRevenueMatrixRow): AssetRevenueValidationIssue[] {
    const requiredFields: Array<keyof AssetRevenueMatrixRow> = [
      'hospitalType',
      'serviceLine',
      'department',
      'product',
      'assetPack',
      'asset',
      'category',
      'pricingTier',
    ];
    const listFields: Array<keyof AssetRevenueMatrixRow> = [
      'buyer',
      'roles',
      'outcomes',
      'subscriptionTiers',
    ];
    const issues: AssetRevenueValidationIssue[] = [];

    for (const field of requiredFields) {
      if (!row[field]) {
        issues.push({
          type: 'row-missing-commercial-field',
          assetId: row.assetId,
          packId: row.assetPackId,
          field,
          message: `${row.assetId} is missing ${field}.`,
        });
      }
    }
    for (const field of listFields) {
      if (!(row[field] as string[])?.length) {
        issues.push({
          type: 'row-missing-commercial-field',
          assetId: row.assetId,
          packId: row.assetPackId,
          field,
          message: `${row.assetId} is missing ${field}.`,
        });
      }
    }

    return issues;
  }

  private static unique<T>(values: T[]) {
    return [...new Set(values.filter(Boolean))];
  }

  private static uniqueBy<T>(values: T[], keyOf: (value: T) => string) {
    const map = new Map<string, T>();
    values.forEach((value) => map.set(keyOf(value), value));
    return [...map.values()];
  }

  private static titleize(value: string) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
