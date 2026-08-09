import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Durable store for EvaluationRun (`evaluation.types.ts`). EvaluationService
 * previously kept every run in a plain in-memory array -- including real
 * runs recorded from live ED Copilot conversations via
 * ChatService.recordEvaluationRun() -- so every one of them, along with its
 * carefully-tracked provenance (MEASURED/SEED_ONLY/UNKNOWN/etc., see
 * lib/ai/provenanceContract.ts), was lost on every backend restart. Stored
 * as one JSON blob per run (matching EmergencyOsSettingsEntity's approach)
 * rather than decomposed into columns, since EvaluationRun's `metrics` field
 * is itself a nested object this codebase already treats atomically.
 */
@Entity('evaluation_runs')
export class EvaluationRunEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'text' })
  runJson: string;

  @CreateDateColumn()
  createdAt: Date;
}
