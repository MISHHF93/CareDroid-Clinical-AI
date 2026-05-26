import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ShortMemoryType {
  ACTIVE_CONVERSATION = 'active_conversation',
  ACTIVE_CALCULATOR = 'active_calculator',
  ACTIVE_DASHBOARD = 'active_dashboard',
}

@Entity('short_memory_entries')
@Index(['userId', 'type', 'updatedAt'])
@Index(['userId', 'workspaceId'])
export class ShortMemoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ type: 'varchar', enum: ShortMemoryType })
  type: ShortMemoryType;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'simple-json', nullable: true })
  content: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
