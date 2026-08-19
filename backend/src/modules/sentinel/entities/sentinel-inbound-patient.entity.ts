import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('sentinel_inbound_patients')
@Index(['unitId', 'status'])
@Index(['organizationId', 'status'])
// HEAL-311: status never transitions away from 'en_route' anywhere in this codebase (the
// historical per-run lifecycle lives in SentinelEmsEpisodeEntity instead) -- this table is
// a current-snapshot row per unit, continuously updated in place. A unique index on unitId
// enforces that invariant at the DB level so two concurrent CAD/NEMSIS webhook deliveries
// for the same unit (a duplicate/retried delivery, or a genuine double-submit) can no longer
// race past the service's read-then-write check and create two PHI rows for one real patient.
// HEAL-347.26: unitId alone was GLOBAL, not namespaced per organization -- two hospitals
// whose CAD/NEMSIS payloads use a colliding unitId silently overwrote each other's
// pre-arrival PHI. See migration 1772703100000. Two partial unique indexes, not one plain
// composite one: SQL treats every NULL as distinct from every other NULL in a unique
// constraint, so a plain (organizationId, unitId) index would silently stop enforcing
// HEAL-311's same-unit race guarantee whenever organizationId is null (no tenant context) --
// confirmed live, the HEAL-311 regression spec started allowing 2 rows again with a plain
// composite index. The org-scoped index below covers real callers; this second one keeps
// the original unitId-only guarantee for the null-organizationId case specifically.
@Index(['organizationId', 'unitId'], { unique: true, where: '"organizationId" IS NOT NULL' })
@Index(['unitId'], { unique: true, where: '"organizationId" IS NULL' })
export class SentinelInboundPatientEntity {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  unitId: string;

  @Column({ type: 'varchar', length: 32, default: 'en_route' })
  status: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  patientLabel: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  patientAge: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  patientSex: string | null;

  @Column({ type: 'text' })
  chiefComplaint: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  priority: string | null;

  @Column({ type: 'simple-json', nullable: true })
  vitals: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  times: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  narrative: string | null;

  @Column({ type: 'integer', nullable: true })
  etaPointMin: number | null;

  @Column({ type: 'integer', nullable: true })
  etaLowMin: number | null;

  @Column({ type: 'integer', nullable: true })
  etaHighMin: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  edPatientId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  nemsisMappedFields: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  missingFields: string[] | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
