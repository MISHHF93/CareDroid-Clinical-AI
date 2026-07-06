import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('collaboration_message_reactions')
@Index(['messageId', 'userId', 'emoji'], { unique: true })
export class CollaborationMessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  messageId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 16 })
  emoji: string;

  @CreateDateColumn()
  createdAt: Date;
}
