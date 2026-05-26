import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('saved_prompts')
@Index(['userId', 'workspaceId'])
export class SavedPrompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
