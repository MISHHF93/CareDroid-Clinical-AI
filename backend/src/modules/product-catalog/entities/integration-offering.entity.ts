import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IntegrationCategory, IntegrationStatus } from '../enums/product-catalog.enums';

@Entity('integration_offerings')
export class IntegrationOffering {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 64 })
  category: IntegrationCategory;

  @Column({ type: 'varchar', length: 32, default: IntegrationStatus.ROADMAP })
  status: IntegrationStatus;

  @Column({ type: 'varchar', length: 80, nullable: true })
  linkedAssetId: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  docsUrl: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
