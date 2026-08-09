import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Durable store for TrainingRun (`training.types.ts`). TrainingService
 * previously kept every run in a plain in-memory array -- a structural
 * sibling of EvaluationService's identical bug, fixed for that module in
 * HEAL-020. Every real run created via createRun()/evaluateRun(), and its
 * provenance (MEASURED/UNKNOWN/etc.), was lost on every backend restart.
 * Stored as one JSON blob per run (same strategy as EvaluationRunEntity),
 * since TrainingRun's `metrics` field is itself a nested object this
 * codebase already treats atomically. The 2 hardcoded baseline/seed runs
 * (training-run-baseline, training-run-artifact-router) are deliberately
 * NOT persisted here -- they're reconstructed identically on every boot
 * from ml-services/models/<head>/metrics.json via syncHeadMetrics().
 */
@Entity('training_runs')
export class TrainingRunEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'text' })
  runJson: string;

  @CreateDateColumn()
  createdAt: Date;
}
