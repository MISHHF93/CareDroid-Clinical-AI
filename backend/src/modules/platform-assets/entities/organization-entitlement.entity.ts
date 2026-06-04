import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntitlementStatus } from '../enums/platform-asset.enums';

@Entity('organization_entitlements')
@Index(['organizationId', 'packId'], { unique: true })
export class OrganizationEntitlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 80 })
  packId: string;

  @Column({ type: 'varchar', length: 32, default: EntitlementStatus.ENABLED })
  status: EntitlementStatus;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
