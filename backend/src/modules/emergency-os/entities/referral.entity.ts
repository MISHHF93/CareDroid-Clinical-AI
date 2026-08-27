import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('referrals')
@Index(['patientId'])
export class Referral {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  patientId: string;

  @Column({ type: 'varchar', length: 120 })
  requestingStaffId: string;

  @Column({ type: 'varchar', length: 120 })
  targetDepartment: string;

  @Column({ type: 'varchar', length: 120 })
  specialty: string;

  @Column({ type: 'varchar', length: 32 })
  urgency: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text' })
  clinicalSummary: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'varchar', length: 64 })
  workflow: string;

  /** The referral's own business timestamp (ISO string), distinct from the DB audit `createdAt` below. */
  @Column({ type: 'varchar', length: 64 })
  requestedAt: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  statusUpdatedAt?: string;

  /**
   * Who most recently changed `status` -- server-derived from the
   * authenticated session in EmergencyOsController.updateTransferStatus,
   * never trusted from the request body (same "never let a client-suppliable
   * field override the authoritative server value" precedent as
   * RequestEmergencyTransportDto/ReconcilePatientIdentityDto). Deliberately
   * distinct from `requestingStaffId` above, which only ever records who
   * originally CREATED the referral -- before this pair of columns existed,
   * every status change (Accept/Decline/Complete/etc.) was silently
   * misattributed to the original requester even when a different receiving-
   * side staff member actually acted. Single-current-actor shape (not a
   * per-transition array) to match this entity's existing flat shape; the
   * durable per-transition trail lives in WorkflowActionLogService via the
   * new `referral_status_changed` workflow log type this same fix adds.
   */
  @Column({ type: 'varchar', length: 120, nullable: true })
  lastActionByStaffId?: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  lastActionByName?: string;

  /**
   * Decline/response reason captured client-side by ReferralPanel.tsx's
   * response-note field (needsResponseNote), previously discarded before
   * reaching the backend -- updateEmergencyTransferWorkflow() only ever sent
   * `{status}`. Kept as a single latest-value column (mirrors
   * `lastActionByStaffId` above) rather than an array, matching this
   * entity's flat shape; a new note overwrites the prior one only when a
   * non-empty value is actually supplied (see updateReferralStatus), so an
   * Acknowledge with no note never clobbers an earlier Decline reason.
   */
  @Column({ type: 'text', nullable: true })
  responseNote?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  organizationId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
