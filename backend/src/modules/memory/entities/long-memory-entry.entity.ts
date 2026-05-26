import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LongMemoryType {
  PREFERENCES = 'preferences',
  HISTORY = 'history',
  SAVED_TOOLS = 'saved_tools',
}

@Entity('long_memory_entries')
@Index(['userId', 'type', 'updatedAt'])
@Index(['userId', 'workspaceId'])
export class LongMemoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ type: 'varchar', enum: LongMemoryType })
  type: LongMemoryType;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'simple-json', nullable: true })
  content: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
