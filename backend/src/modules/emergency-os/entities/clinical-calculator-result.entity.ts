import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Durable store for ClinicalCalculatorResultRecord (`clinical-decision-support.types.ts`).
 * ClinicalDecisionSupportService previously kept every calculator result
 * (HEART/qSOFA/Wells-PE/GCS/NEWS2/NIHSS scores computed for real patients via
 * EmergencyOsController's real recordCalculatorResult route) in a plain
 * in-memory array capped at 500 entries, so every one was lost on every
 * backend restart. Stored as one JSON blob per result, matching this
 * codebase's established EmergencyOsSettingsEntity/EvaluationRunEntity/
 * TrainingRunEntity pattern.
 */
@Entity('clinical_calculator_results')
@Index(['patientId'])
export class ClinicalCalculatorResultEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  patientId?: string;

  @Column({ type: 'text' })
  recordJson: string;

  @CreateDateColumn()
  createdAt: Date;
}
