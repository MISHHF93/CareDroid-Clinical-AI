import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CareTaskEntity } from './entities/care-task.entity';
import {
  EmergencyPatientService,
  EMSIntakeService,
  WorkflowActionLogService,
} from '../emergency-os/emergency-os.services';

export const CARE_TASK_STATUSES = [
  'OPEN',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type CareTaskStatus = (typeof CARE_TASK_STATUSES)[number];

export type CareTaskType = 'reassessment_due' | 'ems_handoff_pending' | 'operational_exception';

const TERMINAL_STATUSES: ReadonlySet<CareTaskStatus> = new Set([
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
]);

/**
 * Operational reminder windows only -- NOT a clinical escalation threshold.
 * These govern when an open task is surfaced as "overdue" in the inbox and
 * when an unclaimed operational_exception auto-expires. Kept as one named,
 * auditable config object rather than scattered magic numbers (item 4).
 */
export const CARE_TASK_OPERATIONAL_SLA_MINUTES: Record<CareTaskType, number> = {
  // A reassessment-due flag is itself the "due now" signal -- no grace window.
  reassessment_due: 0,
  ems_handoff_pending: 15,
  operational_exception: 30,
};

/** How long an unclaimed operational_exception stays actionable before auto-expiring. */
const OPERATIONAL_EXCEPTION_EXPIRY_HOURS = 24;

const LEGAL_TRANSITIONS: Record<CareTaskStatus, readonly CareTaskStatus[]> = {
  OPEN: ['ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  // A user can explicitly reopen a stale, unclaimed exception rather than losing it.
  EXPIRED: ['OPEN'],
};

export interface CareTaskView {
  id: string;
  taskType: CareTaskType;
  status: CareTaskStatus;
  priority: 'Info' | 'Warning' | 'Critical';
  ownerRole?: string;
  ownerUserId?: string;
  patientId?: string;
  encounterId?: string;
  reason: string;
  sourceEvent: string;
  deepLink?: string;
  dueAt?: string;
  isOverdue: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  completedAt?: string;
  completedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt: string;
  updatedAt: string;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toView(row: CareTaskEntity): CareTaskView {
  const status = row.status as CareTaskStatus;
  const isOverdue = Boolean(
    row.dueAt && !TERMINAL_STATUSES.has(status) && new Date(row.dueAt).getTime() < Date.now(),
  );
  return {
    id: row.id,
    taskType: row.taskType as CareTaskType,
    status,
    priority: row.priority as CareTaskView['priority'],
    ownerRole: row.ownerRole,
    ownerUserId: row.ownerUserId,
    patientId: row.patientId,
    encounterId: row.encounterId,
    reason: row.reason,
    sourceEvent: row.sourceEvent,
    deepLink: row.deepLink,
    dueAt: row.dueAt,
    isOverdue,
    acknowledgedAt: row.acknowledgedAt,
    acknowledgedBy: row.acknowledgedBy,
    completedAt: row.completedAt,
    completedBy: row.completedBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

const PRIORITY_RANK: Record<string, number> = { Critical: 0, Warning: 1, Info: 2 };

/**
 * Care Operations Inbox -- one role-aware, backend-persisted list of real
 * outstanding operational work (item 1 of the mega-directive). Two of its
 * three task types are pull-based/derived (reassessment-due, EMS
 * handoff-pending, both reconciled on every read against the live
 * EmergencyPatientService/EMSIntakeService state -- the same authoritative
 * in-memory services every other emergency-os surface reads from, not a
 * separate/stale mirror); the third (operational_exception) is derived from
 * WorkflowActionLogService's own live, in-process log buffer, filtered
 * through the caller's own org-visible patient set for tenant safety since
 * WorkflowActionLogEntry itself has no real per-row org scoping yet (a
 * known, separately-tracked gap -- see HEAL-347.70's own follow-up note).
 *
 * This reconcile-on-read design keeps the inbox honestly synced to current
 * state (item 8: never show stale data as live) without requiring a domain
 * event bus, which this codebase does not have.
 */
@Injectable()
export class CareOperationsService {
  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly emsIntakeService: EMSIntakeService,
    private readonly workflowLogService: WorkflowActionLogService,
    @InjectRepository(CareTaskEntity)
    private readonly careTaskRepository: Repository<CareTaskEntity>,
  ) {}

  async getInbox(organizationId?: string): Promise<{ tasks: CareTaskView[]; generatedAt: string }> {
    if (!organizationId) {
      return { tasks: [], generatedAt: new Date().toISOString() };
    }
    await this.reconcile(organizationId);
    const rows = await this.careTaskRepository.find({ where: { organizationId } });
    const tasks = rows
      .filter((row) => !TERMINAL_STATUSES.has(row.status as CareTaskStatus))
      .map(toView)
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        const rank = (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
        if (rank !== 0) return rank;
        return (a.dueAt || a.createdAt).localeCompare(b.dueAt || b.createdAt);
      });
    return { tasks, generatedAt: new Date().toISOString() };
  }

  async transition(
    id: string,
    input: { status: CareTaskStatus; actorUserId?: string; actorRole?: string },
    organizationId?: string,
  ): Promise<CareTaskView> {
    const row = await this.careTaskRepository.findOne({ where: { id } });
    if (!row || (organizationId && row.organizationId !== organizationId)) {
      throw new NotFoundException(`Care task ${id} not found`);
    }
    const from = row.status as CareTaskStatus;
    const to = input.status;
    if (from !== to) {
      const allowed = LEGAL_TRANSITIONS[from] ?? [];
      if (!allowed.includes(to)) {
        throw new BadRequestException(`Cannot move a care task from ${from} to ${to}`);
      }
    }
    const now = new Date().toISOString();
    row.status = to;
    if (to === 'ACKNOWLEDGED' && !row.ownerUserId) {
      row.ownerUserId = input.actorUserId;
      row.acknowledgedAt = now;
      row.acknowledgedBy = input.actorUserId;
    }
    if (to === 'IN_PROGRESS' && !row.ownerUserId) {
      row.ownerUserId = input.actorUserId;
    }
    if (to === 'COMPLETED') {
      row.completedAt = now;
      row.completedBy = input.actorUserId;
    }
    if (to === 'CANCELLED') {
      row.cancelledAt = now;
      row.cancelledBy = input.actorUserId;
    }
    if (to === 'OPEN' && from === 'EXPIRED') {
      row.ownerUserId = undefined;
      row.acknowledgedAt = undefined;
      row.acknowledgedBy = undefined;
    }
    await this.careTaskRepository.save(row);
    this.workflowLogService.record({
      type: 'care_task_transitioned',
      title: 'Care task updated',
      summary: `${row.taskType} task moved ${from} -> ${to}: ${row.reason}`,
      patientId: row.patientId,
      actorStaffId: input.actorUserId,
      source: 'care-operations-service',
      severity: to === 'CANCELLED' ? 'Warning' : 'Info',
      metadata: {
        taskId: row.id,
        taskType: row.taskType,
        from,
        to,
        actorRole: input.actorRole || null,
      },
    });
    return toView(row);
  }

  private async reconcile(organizationId: string): Promise<void> {
    const now = new Date();
    const existing = await this.careTaskRepository.find({ where: { organizationId } });
    const byDedupeKey = new Map<string, CareTaskEntity[]>();
    for (const row of existing) {
      const list = byDedupeKey.get(row.dedupeKey) ?? [];
      list.push(row);
      byDedupeKey.set(row.dedupeKey, list);
    }
    const hasActive = (key: string) =>
      (byDedupeKey.get(key) ?? []).some(
        (row) => !TERMINAL_STATUSES.has(row.status as CareTaskStatus),
      );

    const toCreate: CareTaskEntity[] = [];
    const liveDedupeKeys = new Set<string>();

    const patients = this.patientService.listPatients(organizationId);
    for (const patient of patients) {
      if (!patient.flags?.includes('ReassessmentDue')) continue;
      const dedupeKey = `reassessment_due:${patient.id}`;
      liveDedupeKeys.add(dedupeKey);
      if (hasActive(dedupeKey)) continue;
      toCreate.push(
        this.careTaskRepository.create({
          id: createId('care-task'),
          organizationId,
          taskType: 'reassessment_due',
          status: 'OPEN',
          priority: 'Warning',
          ownerRole: 'triage_nurse',
          patientId: patient.id,
          reason: `Reassessment due for ${patient.firstName} ${patient.lastName}`.trim(),
          sourceEvent: 'reassessment.due.scan',
          dedupeKey,
          deepLink: `/emergency/reassessment?patient=${encodeURIComponent(patient.id)}`,
          dueAt: now.toISOString(),
        }),
      );
    }

    const emsData = this.emsIntakeService.getEMSIntake(organizationId).data as {
      emsArrivals?: Array<{ id: string; status: string; patientId?: string; unitName?: string }>;
    };
    for (const arrival of emsData.emsArrivals || []) {
      if (arrival.status === 'Offload') continue;
      const dedupeKey = `ems_handoff_pending:${arrival.id}`;
      liveDedupeKeys.add(dedupeKey);
      if (hasActive(dedupeKey)) continue;
      // buildInboundEmsRecord() flattens the row with no nested `.patient`
      // object and an explicitly-undefined `patientId` -- the only way to
      // recover which patient this arrival belongs to is its own
      // `id: ems-arrival-${patientId}` string (see the operating-surfaces
      // tenant-scoping spec's own documented gotcha for this same shape).
      const derivedPatientId = arrival.patientId ?? arrival.id.replace(/^ems-arrival-/, '');
      toCreate.push(
        this.careTaskRepository.create({
          id: createId('care-task'),
          organizationId,
          taskType: 'ems_handoff_pending',
          status: 'OPEN',
          priority: 'Warning',
          ownerRole: 'triage_nurse',
          patientId: derivedPatientId,
          reason: `EMS handoff pending${arrival.unitName ? ` -- ${arrival.unitName}` : ''}`,
          sourceEvent: 'ems.handoff.pending.scan',
          dedupeKey,
          deepLink: '/emergency/ems',
          dueAt: new Date(
            now.getTime() + CARE_TASK_OPERATIONAL_SLA_MINUTES.ems_handoff_pending * 60_000,
          ).toISOString(),
        }),
      );
    }

    // WorkflowActionLogEntry has no real per-row org scoping yet (HEAL-347.70's
    // documented follow-up), so cross-reference every log's patientId against this
    // caller's own org-visible patient set rather than trusting the log's own
    // (phantom) tenantId field -- same defensive pattern used elsewhere in this
    // codebase for cross-org lookups.
    const visiblePatientIds = new Set(patients.map((patient) => patient.id));
    const escalationLogs = this.workflowLogService
      .listLogs()
      .filter(
        (log) =>
          log.type === 'patient_escalated' &&
          log.source === 'reception-workspace' &&
          log.patientId &&
          visiblePatientIds.has(log.patientId),
      );
    for (const log of escalationLogs) {
      const ageMs = now.getTime() - new Date(log.timestamp).getTime();
      if (ageMs > OPERATIONAL_EXCEPTION_EXPIRY_HOURS * 60 * 60 * 1000) continue;
      const dedupeKey = `operational_exception:${log.id}`;
      liveDedupeKeys.add(dedupeKey);
      if (hasActive(dedupeKey)) continue;
      const notifyRoles = String(log.metadata?.notifyRoles || '')
        .split(',')
        .filter(Boolean);
      toCreate.push(
        this.careTaskRepository.create({
          id: createId('care-task'),
          organizationId,
          taskType: 'operational_exception',
          status: 'OPEN',
          priority: log.severity === 'Critical' ? 'Critical' : 'Warning',
          ownerRole: notifyRoles[0] || 'charge_nurse',
          patientId: log.patientId,
          reason: log.summary || 'Reception escalation',
          sourceEvent: 'reception.escalation',
          dedupeKey,
          deepLink: log.patientId
            ? `/emergency/whiteboard?patient=${encodeURIComponent(log.patientId)}`
            : '/emergency/reception',
          dueAt: new Date(
            new Date(log.timestamp).getTime() +
              CARE_TASK_OPERATIONAL_SLA_MINUTES.operational_exception * 60_000,
          ).toISOString(),
        }),
      );
    }

    // Auto-complete reassessment/EMS tasks whose underlying condition has
    // resolved -- item 2's "completion removes resolved work from active
    // attention surfaces." operational_exception has no reliable
    // machine-resolved signal, so it only closes via explicit user action or
    // the expiry rule below.
    const toUpdate: CareTaskEntity[] = [];
    for (const row of existing) {
      if (TERMINAL_STATUSES.has(row.status as CareTaskStatus)) continue;
      if (row.taskType === 'operational_exception') continue;
      if (liveDedupeKeys.has(row.dedupeKey)) continue;
      row.status = 'COMPLETED';
      row.completedAt = now.toISOString();
      row.completedBy = 'system:reconciliation';
      toUpdate.push(row);
    }
    for (const row of existing) {
      if (row.status !== 'OPEN') continue;
      if (row.taskType !== 'operational_exception') continue;
      const ageMs = now.getTime() - new Date(row.createdAt).getTime();
      if (ageMs <= OPERATIONAL_EXCEPTION_EXPIRY_HOURS * 60 * 60 * 1000) continue;
      row.status = 'EXPIRED';
      toUpdate.push(row);
    }

    if (toCreate.length) await this.careTaskRepository.save(toCreate);
    if (toUpdate.length) {
      await this.careTaskRepository.save(toUpdate);
      for (const row of toUpdate) {
        this.workflowLogService.record({
          type: 'care_task_transitioned',
          title: 'Care task auto-resolved',
          summary: `${row.taskType} task ${row.status === 'EXPIRED' ? 'expired' : 'resolved automatically'}: ${row.reason}`,
          patientId: row.patientId,
          source: 'care-operations-service',
          severity: 'Info',
          metadata: { taskId: row.id, taskType: row.taskType, status: row.status },
        });
      }
    }
  }
}
