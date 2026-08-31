import { EmergencyPatientService, WorkflowActionLogService } from './emergency-os.services';
import type { Encounter } from './entities/encounter.entity';

/**
 * Durable per-visit history (ed_encounters). The legacy model derives the
 * encounter id from the patient id, so a returning patient's second visit
 * folded into their first and the new visit's fields overwrote the previous
 * ones in place -- proven by src/services/intakeEncounter.returningPatient
 * .test.ts on the frontend model. These specs verify the new write-through
 * gives each VISIT its own row and that closing + returning preserves the
 * prior visit's snapshot.
 */
class FakeEncounterRepository {
  rows: Encounter[] = [];

  create(partial: Partial<Encounter>): Encounter {
    return { ...partial } as Encounter;
  }

  async save(entity: Encounter): Promise<Encounter> {
    const idx = this.rows.findIndex((row) => row.id === entity.id);
    if (idx === -1) this.rows.push(entity);
    else this.rows[idx] = entity;
    return entity;
  }

  async findOne(options: {
    where: Partial<Encounter>;
    order?: Record<string, 'ASC' | 'DESC'>;
  }): Promise<Encounter | null> {
    const where = options.where;
    const matches = this.rows
      .filter((row) =>
        Object.entries(where).every(
          ([key, value]) => (row as unknown as Record<string, unknown>)[key] === value,
        ),
      )
      // Hydrate per read, like a real repository -- the concurrency work on
      // care_tasks showed a shared-instance fake can hide real bugs.
      .map((row) => ({ ...row }));
    if (options.order?.startedAt === 'DESC') {
      matches.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
    }
    return matches[0] ?? null;
  }
}

/** The sync is fire-and-forget; let its promise chain settle. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

function makeService() {
  const workflowLog = new WorkflowActionLogService();
  const encounterRepository = new FakeEncounterRepository();
  const service = new EmergencyPatientService(
    workflowLog,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    encounterRepository as unknown as never,
  );
  return { service, encounterRepository };
}

describe('EmergencyPatientService encounter history write-through', () => {
  it('opens one active encounter when a patient is created', async () => {
    const { service, encounterRepository } = makeService();

    const patient = service.createPatient(
      { firstName: 'First', lastName: 'Visit', chiefComplaint: 'Chest pain' } as never,
      'org-a',
    );
    await flush();

    const rows = encounterRepository.rows.filter((row) => row.patientId === patient.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('active');
    expect(rows[0].chiefComplaint).toBe('Chest pain');
    expect(rows[0].organizationId).toBe('org-a');
    // Unique per visit -- NOT the legacy patient-derived `encounter-${id}`.
    expect(rows[0].id).not.toBe(`encounter-${patient.id}`);
  });

  it('closes the active encounter on discharge with a frozen snapshot', async () => {
    const { service, encounterRepository } = makeService();
    const patient = service.createPatient(
      { firstName: 'Goes', lastName: 'Home', chiefComplaint: 'Laceration' } as never,
      'org-a',
    );
    await flush();

    service.updatePatient(patient.id, { state: 'Discharge' } as never, 'org-a');
    await flush();

    const rows = encounterRepository.rows.filter((row) => row.patientId === patient.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('completed');
    expect(rows[0].endedAt).toBeTruthy();
    expect(rows[0].chiefComplaint).toBe('Laceration');
  });

  it('opens a SECOND encounter for a returning patient and preserves the first visit', async () => {
    // The defect this table exists to fix: previously the second visit
    // overwrote the first in place and no durable trace of visit 1 remained.
    const { service, encounterRepository } = makeService();
    const patient = service.createPatient(
      { firstName: 'Comes', lastName: 'Back', chiefComplaint: 'Ankle sprain' } as never,
      'org-a',
    );
    await flush();
    service.updatePatient(patient.id, { state: 'Discharge' } as never, 'org-a');
    await flush();

    // Both visits otherwise run inside one millisecond in a unit test, which
    // would make the started-now assertion below compare identical ISO
    // strings regardless of the logic under test.
    await new Promise((resolve) => setTimeout(resolve, 5));

    // Weeks later: same person, new problem. The board reuses the identity
    // and overwrites the patient-row visit fields -- that part is unchanged.
    service.updatePatient(
      patient.id,
      { state: 'Waiting', chiefComplaint: 'Chest pain' } as never,
      'org-a',
    );
    await flush();

    const rows = encounterRepository.rows
      .filter((row) => row.patientId === patient.id)
      .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
    expect(rows).toHaveLength(2);

    const [firstVisit, secondVisit] = rows;
    expect(firstVisit.status).toBe('completed');
    // Visit 1's complaint survives even though the patients row now says
    // "Chest pain" -- this is the history that used to be destroyed.
    expect(firstVisit.chiefComplaint).toBe('Ankle sprain');
    expect(secondVisit.status).toBe('active');
    expect(secondVisit.chiefComplaint).toBe('Chest pain');
    expect(secondVisit.id).not.toBe(firstVisit.id);
    // A returning visit starts NOW -- not at the stale arrivalTime still
    // sitting on the patients row from visit 1. Confirmed live before the
    // fix: both rows carried identical startedAt values.
    expect(secondVisit.startedAt).not.toBe(firstVisit.startedAt);
    expect(String(secondVisit.startedAt) > String(firstVisit.startedAt)).toBe(true);
  });

  it('refreshes the active encounter snapshot on ordinary updates without opening new rows', async () => {
    const { service, encounterRepository } = makeService();
    const patient = service.createPatient(
      { firstName: 'Still', lastName: 'Here', chiefComplaint: 'Headache' } as never,
      'org-a',
    );
    await flush();

    service.updatePatient(patient.id, { priority: 'P2', state: 'Assessment' } as never, 'org-a');
    await flush();

    const rows = encounterRepository.rows.filter((row) => row.patientId === patient.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('active');
    expect(rows[0].priority).toBe('P2');
    expect(rows[0].state).toBe('Assessment');
  });

  it('is inert without a repository, like every other write-through here', async () => {
    const workflowLog = new WorkflowActionLogService();
    const service = new EmergencyPatientService(workflowLog);

    const patient = service.createPatient(
      { firstName: 'No', lastName: 'Database' } as never,
      'org-a',
    );
    expect(() =>
      service.updatePatient(patient.id, { state: 'Discharge' } as never, 'org-a'),
    ).not.toThrow();
  });
});
