import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('encryption_keys')
@Index(['keyVersion'])
@Index(['isActive'])
@Index(['status'])
export class EncryptionKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  keyVersion: number;

  @Column({
    type: 'text',
    comment: 'Encrypted key material - store in secure vault (AWS KMS, HashiCorp Vault, etc.)',
  })
  keyMaterial: string;

  @Column({ type: 'varchar', length: 50 })
  algorithm: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending_rotation',
    comment:
      'pending_rotation | in_progress | re_encryption_complete | active | scheduled_for_deletion',
  })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  rotationReason: string;

  @Column({ type: Date, nullable: true })
  scheduledTime: Date;

  @Column({ type: 'int', default: 0 })
  progressPercentage: number;

  @Column({ type: 'int', default: 0 })
  recordsProcessed: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: Date, nullable: true })
  activatedAt: Date;

  @Column({ type: Date, nullable: true })
  deletionScheduledAt: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Audit information about the rotation',
  })
  auditInfo: string;
}
