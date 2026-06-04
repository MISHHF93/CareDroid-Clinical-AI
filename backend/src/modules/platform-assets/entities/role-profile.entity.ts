import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('role_profiles')
export class RoleProfile {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'simple-json', default: '[]' })
  intendedRoles: string[];

  @Column({ type: 'simple-json', default: '[]' })
  specialties: string[];

  @Column({ type: 'simple-json', default: '[]' })
  preferredAssetIds: string[];

  @Column({ type: 'simple-json', default: '[]' })
  hiddenAssetIds: string[];

  @Column({ type: 'varchar', length: 64, default: 'command' })
  defaultDashboard: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  defaultAiAgentId: string;

  @Column({ type: 'simple-json', default: '[]' })
  requiredPermissions: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
