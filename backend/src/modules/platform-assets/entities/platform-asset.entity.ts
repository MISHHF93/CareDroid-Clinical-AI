import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import {
  PlatformAssetLifecycle,
  PlatformAssetType,
  PricingTier,
} from '../enums/platform-asset.enums';

@Entity('platform_assets')
@Index(['assetType'])
@Index(['lifecycle'])
export class PlatformAsset {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 40 })
  assetType: PlatformAssetType;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  clinicalSpecialty: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  route: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  launchType: string;

  @Column({ type: 'simple-json', nullable: true })
  permissionPolicy: Record<string, unknown>;

  @Column({ type: 'simple-json', default: '[]' })
  organizationTypes: string[];

  @Column({ type: 'simple-json', default: '[]' })
  roleProfiles: string[];

  @Column({ type: 'simple-json', default: '[]' })
  intendedRoles: string[];

  @Column({ type: 'simple-json', default: '[]' })
  workspaceTags: string[];

  @Column({ type: 'simple-json', default: '[]' })
  specialties: string[];

  @Column({ type: 'varchar', length: 80, nullable: true })
  primaryDepartment: string;

  @Column({ type: 'simple-json', default: '[]' })
  secondaryDepartments: string[];

  @Column({ type: 'simple-json', default: '[]' })
  recommendedRoles: string[];

  @Column({ type: 'simple-json', default: '[]' })
  requiredPermissions: string[];

  @Column({ type: 'varchar', length: 32, nullable: true })
  riskLevel: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  backendStatus: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  demoStatus: string;

  @Column({ type: 'simple-json', nullable: true })
  governance: Record<string, unknown>;

  @Column({ type: 'varchar', length: 32, default: PlatformAssetLifecycle.ACTIVE })
  lifecycle: PlatformAssetLifecycle;

  @Column({ type: 'varchar', length: 32, default: PricingTier.STANDARD })
  pricingTier: PricingTier;

  @Column({ type: 'simple-json', default: '[]' })
  packIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  dependencies: string[];

  @Column({ type: 'varchar', length: 16, default: '1.0.0' })
  catalogVersion: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
