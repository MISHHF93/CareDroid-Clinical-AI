import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * One ED visit. This table exists because the system previously had no
 * encounter concept at all: an "encounter" was an EncounterCreated event on
 * the patient's own timeline with an id derived as `encounter-${patient.id}`,
 * so a patient was structurally incapable of a second visit -- a returning
 * patient's new arrival was folded into their first visit and the new visit's
 * fields (arrivalTime, chiefComplaint, priority, ...) overwrote the previous
 * one in place on the patients row. Confirmed by characterization tests in
 * src/services/intakeEncounter.returningPatient.test.ts.
 *
 * Phase 1 (this table): durable one-row-per-visit history, written through
 * from EmergencyPatientService's mutators exactly the way the patients/alerts
 * write-throughs already work -- best-effort, non-blocking, reads untouched.
 * Each row snapshots ITS OWN visit's fields, so discharging and returning no
 * longer destroys the prior visit's record. Readers (whiteboard, timeline,
 * frontend intakeEncounter model) still use the legacy in-memory model and
 * cut over in a later phase.
 */
@Entity('ed_encounters')
@Index(['organizationId'])
@Index(['organizationId', 'patientId'])
@Index(['organizationId', 'patientId', 'status'])
export class Encounter {
  @PrimaryColumn({ type: 'varchar', length: 160 })
  id: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId?: string;

  @Column({ type: 'varchar', length: 120 })
  patientId: string;

  /** 'active' | 'completed' | 'cancelled' */
  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'varchar', length: 64 })
  startedAt: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  endedAt?: string;

  /** Snapshot of THIS visit -- kept current while active, frozen at close. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  arrivalTime?: string;

  @Column({ type: 'text', nullable: true })
  chiefComplaint?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  complaintCategory?: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  priority?: string;

  /** Patient journey state at last sync ('Discharge' once closed). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  arrivalMode?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
