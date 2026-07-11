import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sentinel_integration_cursors')
export class SentinelIntegrationCursorEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 64 })
  vendorId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  lastEventId: string | null;

  @Column({ type: 'integer', default: 0 })
  lastSequence: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastEventAt: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
