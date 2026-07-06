import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum CollaborationAttachmentKind {
  FILE = 'file',
  IMAGE = 'image',
  DOCUMENT = 'document',
  /** Data model supports audio metadata; recording/transcription UI is intentionally deferred. */
  AUDIO = 'audio',
}

@Entity('collaboration_attachments')
@Index(['messageId'])
export class CollaborationAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  messageId: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 120 })
  mimeType: string;

  @Column({
    type: 'varchar',
    enum: CollaborationAttachmentKind,
    default: CollaborationAttachmentKind.FILE,
  })
  kind: CollaborationAttachmentKind;

  @Column({ type: 'int' })
  sizeBytes: number;

  /** Matches the AttachmentStorageProvider that persisted this file (see providers/attachment-storage.provider.ts). */
  @Column({ type: 'varchar', length: 40, default: 'local' })
  storageProvider: string;

  @Column({ type: 'varchar', length: 500 })
  storageKey: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  url: string | null;

  @Column({ type: 'uuid' })
  uploadedByUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
