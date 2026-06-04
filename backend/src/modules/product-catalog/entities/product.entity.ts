import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductType } from '../enums/product-catalog.enums';

@Entity('products')
export class Product {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 64 })
  productType: ProductType;

  @Column({ type: 'simple-json', default: '[]' })
  packIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  highlightAssetIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  outcomes: string[];

  @Column({ type: 'simple-json', default: '[]' })
  targetBuyers: string[];

  @Column({ type: 'varchar', length: 32, nullable: true })
  complexity: string;

  @Column({ type: 'simple-json', default: '[]' })
  commercialPlanIds: string[];

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
