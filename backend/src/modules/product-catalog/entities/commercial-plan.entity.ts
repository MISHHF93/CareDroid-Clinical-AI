import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { PricingTier } from '../../platform-assets/enums/platform-asset.enums';
import { CommercialPlanId } from '../enums/product-catalog.enums';

@Entity('commercial_plans')
export class CommercialPlan {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: CommercialPlanId;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json', default: '[]' })
  includedProductIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  includedPackIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  maxPackIds: string[];

  @Column({ type: 'varchar', length: 32, default: PricingTier.STANDARD })
  pricingTier: PricingTier;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
