import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ClinicalMemoryType {
  FINDINGS = 'findings',
  SUMMARIES = 'summaries',
  SCORES = 'scores',
}

@Entity('clinical_memory_entries')
@Index(['userId', 'type', 'updatedAt'])
@Index(['userId', 'patientId'])
@Index(['workspaceId', 'updatedAt'])
export class ClinicalMemoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  patientId: string;

  @Column({ type: 'varchar', enum: ClinicalMemoryType })
  type: ClinicalMemoryType;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'simple-json', nullable: true })
  content: Record<string, any>;

  @Column({ type: 'varchar', length: 80, nullable: true })
  source: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
