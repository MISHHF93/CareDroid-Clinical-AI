import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { OrganizationType, PricingTier } from '../enums/platform-asset.enums';

@Entity('asset_packs')
export class AssetPack {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json', default: '[]' })
  organizationTypes: OrganizationType[];

  @Column({ type: 'simple-json', default: '[]' })
  targetRoles: string[];

  @Column({ type: 'simple-json', default: '[]' })
  assetIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  requiredDependencies: string[];

  @Column({ type: 'simple-json', nullable: true })
  salesMetadata: Record<string, unknown>;

  @Column({ type: 'simple-json', default: '[]' })
  defaultModules: string[];

  @Column({ type: 'varchar', length: 32, default: PricingTier.STANDARD })
  pricingTier: PricingTier;

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
