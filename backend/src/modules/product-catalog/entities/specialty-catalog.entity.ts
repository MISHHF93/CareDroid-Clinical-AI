import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('specialty_catalog')
export class SpecialtyCatalog {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json', default: '[]' })
  assetIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  protocolAssetIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  simulationAssetIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  workflowAssetIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  dashboardAssetIds: string[];

  @Column({ type: 'varchar', length: 80, nullable: true })
  defaultAiAgentId: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
