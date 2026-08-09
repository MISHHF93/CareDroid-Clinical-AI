import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Durable store for CopilotInteractionRecord (`clinical-decision-support.types.ts`).
 * ClinicalDecisionSupportService previously kept every real Copilot
 * interaction (recorded automatically on every real query through
 * EmergencyOsController.queryCopilot() -> ChatService.processMessage(), the
 * live production ED Copilot path) in a plain in-memory array capped at 500
 * entries -- a clinical decision-support audit trail (safetyCheckPassed,
 * requiresHumanReview, reviewedByUserId) silently lost on every backend
 * restart. Stored as one JSON blob per interaction, matching this
 * codebase's established persistence pattern.
 */
@Entity('copilot_interactions')
@Index(['patientId'])
export class CopilotInteractionEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  patientId?: string;

  @Column({ type: 'text' })
  recordJson: string;

  @CreateDateColumn()
  createdAt: Date;
}
