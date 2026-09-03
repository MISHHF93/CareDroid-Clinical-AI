import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tool_results')
@Index(['userId', 'timestamp'])
@Index(['toolType', 'timestamp'])
export class ToolResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  toolType: string;

  @Column({ type: 'simple-json', nullable: true })
  input: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  output: Record<string, any>;

  @Column({ type: Date, default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}
