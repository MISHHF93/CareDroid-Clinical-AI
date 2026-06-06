import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssetRegistryRiskLevel,
  AssetRegistryType,
} from './asset-registry.schema';
import {
  AssetRegistryService,
  PlatformAssetRegistryProjection,
} from './asset-registry.service';
import { AssetPack } from './entities/asset-pack.entity';

type GovernanceJson = Record<string, any>;

const CLINICAL_RISKS = new Set<string>([
  AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT,
  AssetRegistryRiskLevel.HIGH_RISK,
  AssetRegistryRiskLevel.GOVERNANCE_REQUIRED,
]);

@Injectable()
export class PlatformGovernanceRegistryService {
  constructor(
    private readonly assetRegistryService: AssetRegistryService,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
  ) {}

  async getRegistry(params: { query?: string; riskLevel?: string; owner?: string; assetType?: string } = {}) {
    const [assets, packs] = await Promise.all([
      this.assetRegistryService.listAssets({ query: params.query, assetType: params.assetType }),
      this.packRepository.find({ order: { name: 'ASC' } }),
    ]);
    const packById = new Map(packs.map((pack) => [pack.id, pack]));
    const rows = assets
      .map((asset) => this.toRegistryRow(asset, packById))
      .filter((row) => !params.riskLevel || row.riskLevel === params.riskLevel)
      .filter((row) => !params.owner || row.owner.toLowerCase().includes(params.owner.toLowerCase()));

    return {
      generatedAt: new Date().toISOString(),
      summary: this.buildSummary(rows),
      requiredFields: [
        'owner',
        'steward',
        'approver',
        'riskLevel',
        'evidenceSource',
        'version',
        'auditRequirement',
        'reviewSchedule',
      ],
      rows,
    };
  }

  private toRegistryRow(asset: PlatformAssetRegistryProjection, packById: Map<string, AssetPack>) {
    const governance = (asset.governance || {}) as GovernanceJson;
    const primaryPack = (asset.packIds || []).map((packId) => packById.get(packId)).find(Boolean);
    const riskLevel = this.stringValue(governance.riskLevel || governance.clinicalRiskLevel || asset.riskLevel);
    const owner =
      this.stringValue(governance.owner || governance.assetOwner || governance.businessOwner) ||
      this.packOwner(primaryPack) ||
      this.ownerForAsset(asset);
    const steward =
      this.stringValue(governance.steward || governance.assetSteward || governance.dataSteward) ||
      this.stewardForAsset(asset);
    const approver =
      this.stringValue(governance.approver || governance.approvalAuthority || governance.clinicalApprover) ||
      this.approverForRisk(riskLevel);
    const evidenceSource =
      this.stringValue(governance.evidenceSource || governance.validationEvidence || governance.sourceOfTruth) ||
      this.evidenceSourceForAsset(asset, primaryPack);
    const version = this.stringValue(governance.version || governance.catalogVersion || asset.catalogVersion) || '1.0.0';
    const auditRequirement =
      this.stringValue(governance.auditRequirement) ||
      (governance.auditRequired === false ? 'standard' : this.auditRequirementForRisk(riskLevel));
    const reviewSchedule =
      this.stringValue(governance.reviewSchedule || governance.reviewCadence) ||
      this.reviewScheduleForRisk(riskLevel);
    const missingFields = Object.entries({
      owner,
      steward,
      approver,
      riskLevel,
      evidenceSource,
      version,
      auditRequirement,
      reviewSchedule,
    })
      .filter(([, value]) => !value)
      .map(([field]) => field);

    return {
      assetId: asset.id,
      title: asset.title,
      assetType: asset.type || asset.assetType,
      category: asset.category,
      route: asset.route,
      lifecycle: asset.lifecycleStatus || asset.lifecycle,
      packIds: asset.packIds || [],
      owner,
      steward,
      approver,
      riskLevel,
      evidenceSource,
      version,
      auditRequirement,
      reviewSchedule,
      requiresHumanReview: governance.requiresHumanReview === true || CLINICAL_RISKS.has(riskLevel),
      completeness: missingFields.length ? 'incomplete' : 'complete',
      missingFields,
      source: {
        governanceMetadata: Object.keys(governance).length ? 'asset.governance' : 'derived',
        primaryPackId: primaryPack?.id || null,
        primaryPackName: primaryPack?.name || null,
      },
    };
  }

  private buildSummary(rows: Array<ReturnType<PlatformGovernanceRegistryService['toRegistryRow']>>) {
    const byRiskLevel = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.riskLevel] = (acc[row.riskLevel] || 0) + 1;
      return acc;
    }, {});
    return {
      totalAssets: rows.length,
      complete: rows.filter((row) => row.completeness === 'complete').length,
      incomplete: rows.filter((row) => row.completeness !== 'complete').length,
      auditRequired: rows.filter((row) => row.auditRequirement === 'required').length,
      humanReviewRequired: rows.filter((row) => row.requiresHumanReview).length,
      byRiskLevel,
    };
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  private packOwner(pack?: AssetPack) {
    const metadata = (pack?.salesMetadata || {}) as GovernanceJson;
    const buyerPersona = Array.isArray(metadata.buyerPersona) ? metadata.buyerPersona[0] : '';
    return this.stringValue(metadata.targetBuyer || buyerPersona);
  }

  private ownerForAsset(asset: PlatformAssetRegistryProjection) {
    if (asset.assetType === 'integration' || asset.type === AssetRegistryType.INTEGRATION) {
      return 'Integration Platform Owner';
    }
    if (asset.assetType === 'ai_agent' || asset.type === AssetRegistryType.AI_AGENT) {
      return 'AI Platform Owner';
    }
    if (asset.category?.toLowerCase().includes('governance')) return 'Platform Governance Owner';
    return 'Clinical Platform Owner';
  }

  private stewardForAsset(asset: PlatformAssetRegistryProjection) {
    if (asset.category?.toLowerCase().includes('security')) return 'Security Steward';
    if (asset.category?.toLowerCase().includes('regulatory')) return 'Regulatory Steward';
    if (asset.assetType === 'simulation' || asset.type === AssetRegistryType.SIMULATION) {
      return 'Simulation Program Steward';
    }
    if (asset.assetType === 'integration' || asset.type === AssetRegistryType.INTEGRATION) {
      return 'Interoperability Steward';
    }
    return 'Clinical Informatics Steward';
  }

  private approverForRisk(riskLevel: string) {
    if (riskLevel === AssetRegistryRiskLevel.HIGH_RISK) return 'Clinical Safety Board';
    if (riskLevel === AssetRegistryRiskLevel.GOVERNANCE_REQUIRED) return 'Governance Review Board';
    if (riskLevel === AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT) return 'Clinical Governance Lead';
    if (riskLevel === AssetRegistryRiskLevel.OPERATIONAL) return 'Operations Governance Lead';
    return 'Asset Steward';
  }

  private evidenceSourceForAsset(asset: PlatformAssetRegistryProjection, pack?: AssetPack) {
    if (asset.route) return `Asset registry route: ${asset.route}`;
    if (pack?.id) return `Asset pack: ${pack.id}`;
    return 'Platform asset registry';
  }

  private auditRequirementForRisk(riskLevel: string) {
    return CLINICAL_RISKS.has(riskLevel) || riskLevel === AssetRegistryRiskLevel.OPERATIONAL
      ? 'required'
      : 'standard';
  }

  private reviewScheduleForRisk(riskLevel: string) {
    if (riskLevel === AssetRegistryRiskLevel.HIGH_RISK) return 'quarterly';
    if (riskLevel === AssetRegistryRiskLevel.GOVERNANCE_REQUIRED) return 'quarterly';
    if (riskLevel === AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT) return 'semiannual';
    return 'annual';
  }
}
