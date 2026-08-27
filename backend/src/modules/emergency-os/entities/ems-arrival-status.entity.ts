import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Durable EMS arrival status transitions (Inbound -> Arrived -> Handoff -> Complete).
 * Before this entity, EMSIntakeService.getEMSIntake() synthesized every arrival fresh
 * from patient records on every request with no tracked transition state at all -- the
 * offload clock (arrivedAt/handoffStartedAt/handoffCompletedAt) lived only in each
 * browser tab's local store, so it reset on reload and diverged across workstations.
 */
@Entity('ems_arrival_status')
@Index(['patientId'])
export class EmsArrivalStatus {
  /** The same arrivalId the frontend already uses (e.g. `ems-arrival-<patientId>`) -- opaque, not generated here. */
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  patientId?: string;

  @Column({ type: 'varchar', length: 96, nullable: true })
  unitId?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  unitName?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  arrivedAt?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  handoffStartedAt?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  handoffCompletedAt?: string;

  /**
   * Distinguishes a physician-initiated SIMULATED transport request (see
   * EMSIntakeService.requestPhysicianTransport) from a normal EMS-initiated
   * arrival. There is no real ambulance/CAD/911 dispatch system connected
   * anywhere in this codebase -- `physician_initiated_simulated` rows are an
   * honest, internal, audited CareDroid record only, never a real dispatch.
   * `undefined`/legacy rows (every arrival created before this column
   * existed) are real EMS-initiated arrivals and are never relabeled.
   */
  @Column({ type: 'varchar', length: 48, nullable: true })
  source?: string;

  /** Requesting physician's user id (server-derived from the authenticated session, never client-supplied). */
  @Column({ type: 'varchar', length: 96, nullable: true })
  requestedByStaffId?: string;

  /** Requesting physician's display name, for the audit trail and ED-facing badge. */
  @Column({ type: 'varchar', length: 160, nullable: true })
  requestedByName?: string;

  /** Clinical reason/summary the requesting physician gave for the (simulated) transport request. */
  @Column({ type: 'varchar', length: 2000, nullable: true })
  reason?: string;

  /** Requested urgency, P1-P5, matching EmergencyPriority. */
  @Column({ type: 'varchar', length: 8, nullable: true })
  urgency?: string;

  /** Free-text transport location/address supplied by the requesting physician. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  location?: string;

  /**
   * The RECEIVING clinician who accepted a REAL EMS handoff (EMSIntakeService.
   * completeHandoff) -- distinct from requestedByStaffId/Name above, which is
   * the requesting/EMS-side identity for a physician-initiated SIMULATED
   * transport. Always server-derived from the authenticated session on the
   * "Complete Handoff" endpoint (see EmergencyOsController.postEmsHandoff),
   * never trusted from the client body, matching this session's
   * requestPhysicianTransport/reconcilePatientIdentity precedent.
   */
  @Column({ type: 'varchar', length: 96, nullable: true })
  handoffAcceptedByStaffId?: string;

  /** Accepting clinician's display name, for the audit trail and ED-facing badge. */
  @Column({ type: 'varchar', length: 160, nullable: true })
  handoffAcceptedByStaffName?: string;

  /**
   * Structured ambulance handoff checklist content the receiving clinician
   * actually documented during handoff -- mirrors AmbulanceHandoffChecklist's
   * field names (src/services/ambulanceHandoffChecklist.ts) exactly so no
   * translation layer is needed between the client type and this column set.
   * Before these columns existed, EMSPipeline.tsx's "Complete Handoff" only
   * ever sent a stripped {handoffAccepted, handoffAcceptedAt} payload -- the
   * identity/vitals/medications/critical-flags/destination fields the
   * clinician actually filled in were thrown away, never reaching the
   * backend at all (see EMSIntakeService.completeHandoff's own doc comment).
   */
  @Column({ type: 'varchar', length: 24, nullable: true })
  handoffIdentityStatus?: string;

  @Column({ type: 'boolean', nullable: true })
  handoffVitalsReceived?: boolean;

  @Column({ type: 'simple-json', nullable: true })
  handoffMedicationsEnRoute?: string[];

  @Column({ type: 'simple-json', nullable: true })
  handoffCriticalFlags?: unknown[];

  @Column({ type: 'varchar', length: 24, nullable: true })
  handoffPatientDestination?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
