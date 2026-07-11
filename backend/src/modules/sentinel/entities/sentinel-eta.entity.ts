import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('sentinel_eta_snapshots')
@Index(['unitId', 'calculatedAt'])
export class SentinelEtaEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  unitId: string;

  @Column({ type: 'integer' })
  etaPointMin: number;

  @Column({ type: 'integer' })
  etaLowMin: number;

  @Column({ type: 'integer' })
  etaHighMin: number;

  @Column({ type: 'float' })
  confidence: number;

  @Column({ type: 'varchar', length: 32 })
  method: string;

  @Column({ type: 'varchar', length: 64 })
  inputsHash: string;

  @Column({ type: 'float' })
  distanceKm: number;

  @Column({ type: 'boolean', default: false })
  stale: boolean;

  @Column({ type: 'varchar', length: 64 })
  calculatedAt: string;

  @CreateDateColumn()
  createdAt: Date;
}
