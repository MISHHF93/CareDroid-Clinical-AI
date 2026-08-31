import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  EmergencyPatientService,
  EMSIntakeService,
  QueueIntelligenceService,
  ReceptionWorkspaceService,
  WorkflowActionLogService,
} from '../emergency-os/emergency-os.services';
import { CareOperationsService } from './care-operations.service';
import type { CareTaskEntity } from './entities/care-task.entity';

/**
 * Lightweight in-memory stand-in for TypeORM's Repository<CareTaskEntity>,
 * matching the same "construct services directly with new()" pattern this
 * codebase already uses for emergency-os unit tests (see
 * emergency-os.operating-surfaces-tenant-scoping.spec.ts) rather than
 * spinning up full Nest DI / a real database for a unit test.
 */
class FakeCareTaskRepository {
  rows: CareTaskEntity[] = [];

  create(partial: Partial<CareTaskEntity>): CareTaskEntity {
    return { ...partial } as CareTaskEntity;
  }

  async find(options?: { where?: Partial<CareTaskEntity> }): Promise<CareTaskEntity[]> {
    const where = options?.where || {};
    return (
      this.rows
        .filter((row) =>
          Object.entries(where).every(
            ([key, value]) => (row as unknown as Record<string, unknown>)[key] === value,
          ),
        )
        // A real repository hydrates a NEW object per read. Returning the
        // stored instance let one caller's in-place mutation retroactively
        // change what a concurrent caller had already read, which hid the
        // very claim race these tests exist to catch.
        .map((row) => ({ ...row }))
    );
  }

  async findOne(options: { where: Partial<CareTaskEntity> }): Promise<CareTaskEntity | null> {
    const results = await this.find(options);
    return results[0] ?? null;
  }

  /**
   * Minimal stand-in for the conditional-UPDATE claim path. It must honour the
   * `ownerUserId IS NULL` guard, because that guard IS the thing under test:
   * a fake that ignores it would make the concurrency test pass vacuously.
   */
  createQueryBuilder() {
    const rows = () => this.rows;
    const state: { values: Partial<CareTaskEntity>; id?: string; requireUnowned: boolean } = {
      values: {},
      requireUnowned: false,
    };
    const builder = {
      update() {
        return builder;
      },
      set(values: Partial<CareTaskEntity>) {
        state.values = values;
        return builder;
      },
      where(_clause: string, params?: Record<string, unknown>) {
        if (params && 'id' in params) state.id = String(params.id);
        return builder;
      },
      andWhere(clause: string, params?: Record<string, unknown>) {
        if (params && 'id' in params) state.id = String(params.id);
        if (/ownerUserId IS NULL/i.test(clause)) state.requireUnowned = true;
        return builder;
      },
      async execute() {
        const row = rows().find((candidate) => candidate.id === state.id);
        if (!row) return { affected: 0 };
        if (state.requireUnowned && row.ownerUserId) return { affected: 0 };
        Object.assign(row, state.values);
        row.updatedAt = new Date();
        return { affected: 1 };
      },
    };
    return builder;
  }

  async save(entityOrEntities: CareTaskEntity | CareTaskEntity[]): Promise<unknown> {
    const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
    for (const entity of entities) {
      if (!entity.createdAt) entity.createdAt = new Date();
      entity.updatedAt = new Date();
      const idx = this.rows.findIndex((row) => row.id === entity.id);
      if (idx === -1) this.rows.push(entity);
      else this.rows[idx] = entity;
    }
    return entityOrEntities;
  }
}

function makeServices() {
  const workflowLogService = new WorkflowActionLogService();
  const patientService = new EmergencyPatientService(workflowLogService);
  const emsIntakeService = new EMSIntakeService(patientService, workflowLogService);
  const queueService = new QueueIntelligenceService(patientService);
  const receptionWorkspaceService = new ReceptionWorkspaceService(
    patientService,
    emsIntakeService,
    queueService,
    workflowLogService,
  );
  const careTaskRepository = new FakeCareTaskRepository();
  const service = new CareOperationsService(
    patientService,
    emsIntakeService,
    workflowLogService,
    careTaskRepository as unknown as import('typeorm').Repository<CareTaskEntity>,
  );
  return {
    patientService,
    emsIntakeService,
    receptionWorkspaceService,
    careTaskRepository,
    service,
  };
}

describe('CareOperationsService', () => {
  it('returns an empty inbox when no organizationId is available (no safe scope to reconcile into)', async () => {
    const { service } = makeServices();
    const inbox = await service.getInbox(undefined);
    expect(inbox.tasks).toEqual([]);
  });

  it('creates an OPEN reassessment_due task for a flagged patient, and excludes a different org’s flagged patient', async () => {
    const { patientService, service } = makeServices();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org', flags: ['ReassessmentDue'] } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org', flags: ['ReassessmentDue'] } as any,
      'org-b',
    );

    const inboxA = await service.getInbox('org-a');
    expect(
      inboxA.tasks.some((t) => t.patientId === patientA.id && t.taskType === 'reassessment_due'),
    ).toBe(true);
    expect(inboxA.tasks.some((t) => t.patientId === patientB.id)).toBe(false);
    expect(inboxA.tasks.find((t) => t.patientId === patientA.id)?.status).toBe('OPEN');
  });

  it('reconciling twice does not create duplicate tasks for the same patient', async () => {
    const { patientService, service, careTaskRepository } = makeServices();
    const patient = patientService.createPatient(
      { firstName: 'Repeat', lastName: 'Scan', flags: ['ReassessmentDue'] } as any,
      'org-a',
    );
    await service.getInbox('org-a');
    await service.getInbox('org-a');
    const rowsForPatient = careTaskRepository.rows.filter((row) => row.patientId === patient.id);
    expect(rowsForPatient.length).toBe(1);
  });

  it('auto-completes a reassessment_due task once the underlying flag clears, removing it from the active inbox', async () => {
    const { patientService, service } = makeServices();
    const patient = patientService.createPatient(
      { firstName: 'Clears', lastName: 'Flag', flags: ['ReassessmentDue'] } as any,
      'org-a',
    );
    const before = await service.getInbox('org-a');
    expect(before.tasks.some((t) => t.patientId === patient.id)).toBe(true);

    patientService.updatePatient(patient.id, { flags: [] }, 'org-a');
    const after = await service.getInbox('org-a');
    expect(after.tasks.some((t) => t.patientId === patient.id)).toBe(false);
  });

  it('creates an ems_handoff_pending task for a non-Offload EMS arrival', async () => {
    const { patientService, service } = makeServices();
    const patient = patientService.createPatient(
      { firstName: 'EMS', lastName: 'Arrival', flags: ['EMSArrival'], state: 'Arrival' } as any,
      'org-a',
    );
    const inbox = await service.getInbox('org-a');
    // EmergencyPatientService seeds fixture patients (legacy, no
    // organizationId) at construction, some of which may already be
    // EMS-flagged -- match on this specific patient rather than the first
    // ems_handoff_pending task found.
    const task = inbox.tasks.find(
      (t) => t.taskType === 'ems_handoff_pending' && t.patientId === patient.id,
    );
    expect(task).toBeDefined();
    expect(task?.dueAt).toBeDefined();
  });

  it('creates an operational_exception task from a real reception escalation, scoped to the caller’s own org', async () => {
    const { patientService, receptionWorkspaceService, service } = makeServices();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org' } as any,
      'org-b',
    );

    receptionWorkspaceService.raiseEscalation(
      { patientId: patientA.id, reasonLabel: 'Needs urgent triage', severity: 'Critical' },
      'org-a',
    );
    receptionWorkspaceService.raiseEscalation(
      { patientId: patientB.id, reasonLabel: 'Different hospital issue', severity: 'Critical' },
      'org-b',
    );

    const inboxA = await service.getInbox('org-a');
    const exceptionTasks = inboxA.tasks.filter((t) => t.taskType === 'operational_exception');
    expect(exceptionTasks.some((t) => t.patientId === patientA.id)).toBe(true);
    expect(exceptionTasks.some((t) => t.patientId === patientB.id)).toBe(false);
    expect(exceptionTasks.find((t) => t.patientId === patientA.id)?.priority).toBe('Critical');
  });

  it('walks a task through the full closed-loop lifecycle and stamps ownership on first claim', async () => {
    const { patientService, service } = makeServices();
    const patient = patientService.createPatient(
      { firstName: 'Lifecycle', lastName: 'Test', flags: ['ReassessmentDue'] } as any,
      'org-a',
    );
    const inbox = await service.getInbox('org-a');
    const task = inbox.tasks.find((t) => t.patientId === patient.id)!;

    const acknowledged = await service.transition(
      task.id,
      { status: 'ACKNOWLEDGED', actorUserId: 'user-1', actorRole: 'triage_nurse' },
      'org-a',
    );
    expect(acknowledged.status).toBe('ACKNOWLEDGED');
    expect(acknowledged.ownerUserId).toBe('user-1');

    const inProgress = await service.transition(
      task.id,
      { status: 'IN_PROGRESS', actorUserId: 'user-1' },
      'org-a',
    );
    expect(inProgress.status).toBe('IN_PROGRESS');

    const completed = await service.transition(
      task.id,
      { status: 'COMPLETED', actorUserId: 'user-1' },
      'org-a',
    );
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completedBy).toBe('user-1');

    const inboxAfter = await service.getInbox('org-a');
    expect(inboxAfter.tasks.some((t) => t.id === task.id)).toBe(false);
  });

  it('rejects an illegal transition (COMPLETED cannot move back to OPEN)', async () => {
    const { patientService, service } = makeServices();
    const patient = patientService.createPatient(
      { firstName: 'Illegal', lastName: 'Transition', flags: ['ReassessmentDue'] } as any,
      'org-a',
    );
    const inbox = await service.getInbox('org-a');
    const task = inbox.tasks.find((t) => t.patientId === patient.id)!;

    await service.transition(task.id, { status: 'COMPLETED', actorUserId: 'user-1' }, 'org-a');
    await expect(
      service.transition(task.id, { status: 'OPEN', actorUserId: 'user-1' }, 'org-a'),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses to transition a task belonging to a different organization', async () => {
    const { patientService, service } = makeServices();
    const patient = patientService.createPatient(
      { firstName: 'CrossOrg', lastName: 'Attempt', flags: ['ReassessmentDue'] } as any,
      'org-a',
    );
    const inbox = await service.getInbox('org-a');
    const task = inbox.tasks.find((t) => t.patientId === patient.id)!;

    await expect(
      service.transition(task.id, { status: 'ACKNOWLEDGED', actorUserId: 'intruder' }, 'org-b'),
    ).rejects.toThrow(NotFoundException);
  });

  describe('claim concurrency', () => {
    async function openTaskFor(org: string) {
      const services = makeServices();
      const patient = services.patientService.createPatient(
        { firstName: 'Race', lastName: 'Candidate', flags: ['ReassessmentDue'] } as any,
        org,
      );
      const inbox = await services.service.getInbox(org);
      const task = inbox.tasks.find((t) => t.patientId === patient.id)!;
      return { ...services, task };
    }

    it('gives exactly one owner when two users claim the same task concurrently', async () => {
      // Before this fix the claim was read-check-write: both callers read the
      // task unowned, both assigned themselves, and the last save silently
      // won -- leaving the loser's UI showing they owned work that was really
      // someone else's. In an ED that is two nurses each assuming the other
      // has the reassessment.
      const { service, careTaskRepository, task } = await openTaskFor('org-a');

      const results = await Promise.allSettled([
        service.transition(task.id, { status: 'ACKNOWLEDGED', actorUserId: 'nurse-1' }, 'org-a'),
        service.transition(task.id, { status: 'ACKNOWLEDGED', actorUserId: 'nurse-2' }, 'org-a'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

      // The database, not the last writer, decided the owner.
      const stored = careTaskRepository.rows.find((row) => row.id === task.id)!;
      expect(['nurse-1', 'nurse-2']).toContain(stored.ownerUserId);
      expect(stored.acknowledgedBy).toBe(stored.ownerUserId);
      const winner = (fulfilled[0] as PromiseFulfilledResult<{ ownerUserId?: string }>).value;
      expect(winner.ownerUserId).toBe(stored.ownerUserId);
    });

    it('lets the existing owner keep transitioning their own task', async () => {
      const { service, task } = await openTaskFor('org-a');

      await service.transition(task.id, { status: 'ACKNOWLEDGED', actorUserId: 'nurse-1' }, 'org-a');
      const progressed = await service.transition(
        task.id,
        { status: 'IN_PROGRESS', actorUserId: 'nurse-1' },
        'org-a',
      );

      expect(progressed.status).toBe('IN_PROGRESS');
      expect(progressed.ownerUserId).toBe('nurse-1');
    });

    it('still allows a different user to complete work already owned', async () => {
      // Completion is not ownership-acquiring: a charge nurse closing out a
      // colleague's task must not be blocked by the claim guard.
      const { service, task } = await openTaskFor('org-a');

      await service.transition(task.id, { status: 'ACKNOWLEDGED', actorUserId: 'nurse-1' }, 'org-a');
      const completed = await service.transition(
        task.id,
        { status: 'COMPLETED', actorUserId: 'charge-1' },
        'org-a',
      );

      expect(completed.status).toBe('COMPLETED');
      expect(completed.ownerUserId).toBe('nurse-1');
    });
  });
});
