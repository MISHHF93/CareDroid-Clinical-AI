import { AiFeedbackService } from './ai-feedback.service';
import type { AiFeedbackEntity } from './entities/ai-feedback.entity';

class FakeAiFeedbackRepository {
  rows: AiFeedbackEntity[] = [];

  create(partial: Partial<AiFeedbackEntity>): AiFeedbackEntity {
    return { ...partial } as AiFeedbackEntity;
  }

  async save(entity: AiFeedbackEntity): Promise<AiFeedbackEntity> {
    if (!entity.createdAt) entity.createdAt = new Date();
    this.rows.push(entity);
    return entity;
  }

  async find(options: {
    where?: Partial<AiFeedbackEntity>;
    order?: unknown;
    take?: number;
  }): Promise<AiFeedbackEntity[]> {
    const where = options.where || {};
    const matches = this.rows.filter((row) =>
      Object.entries(where).every(
        ([key, value]) => (row as unknown as Record<string, unknown>)[key] === value,
      ),
    );
    const sorted = [...matches].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return typeof options.take === 'number' ? sorted.slice(0, options.take) : sorted;
  }
}

function makeService() {
  const repo = new FakeAiFeedbackRepository();
  const service = new AiFeedbackService(
    repo as unknown as import('typeorm').Repository<AiFeedbackEntity>,
  );
  return { repo, service };
}

describe('AiFeedbackService', () => {
  it('stores feedback tied to the response runId, scoped to the submitting org', async () => {
    const { service, repo } = makeService();

    const result = await service.submit(
      { runId: 'run-1', capabilityId: 'clinical-chat', rating: 'HELPFUL' },
      'user-1',
      'org-a',
    );

    expect(result.id).toBeDefined();
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({
      runId: 'run-1',
      capabilityId: 'clinical-chat',
      userId: 'user-1',
      organizationId: 'org-a',
      rating: 'HELPFUL',
    });
  });

  it('stores an optional comment alongside a more specific rating', async () => {
    const { service, repo } = makeService();

    await service.submit(
      {
        runId: 'run-2',
        rating: 'UNSAFE_CONCERN',
        comment: 'Suggested a dosage without checking allergies.',
      },
      'user-2',
      'org-a',
    );

    expect(repo.rows[0].rating).toBe('UNSAFE_CONCERN');
    expect(repo.rows[0].comment).toContain('dosage');
  });

  it('listRecent only returns feedback for the caller’s own organization, newest first', async () => {
    const { service } = makeService();

    await service.submit({ runId: 'run-a1', rating: 'HELPFUL' }, 'user-1', 'org-a');
    await new Promise((resolve) => setTimeout(resolve, 2));
    await service.submit({ runId: 'run-b1', rating: 'NOT_HELPFUL' }, 'user-2', 'org-b');
    await new Promise((resolve) => setTimeout(resolve, 2));
    await service.submit({ runId: 'run-a2', rating: 'INCORRECT' }, 'user-1', 'org-a');

    const orgAFeedback = await service.listRecent('org-a');

    expect(orgAFeedback.map((row) => row.runId)).toEqual(['run-a2', 'run-a1']);
    expect(orgAFeedback.some((row) => row.runId === 'run-b1')).toBe(false);
  });

  it('listRecent returns nothing when no organizationId is available (no safe scope)', async () => {
    const { service } = makeService();
    await service.submit({ runId: 'run-1', rating: 'HELPFUL' }, 'user-1', 'org-a');

    expect(await service.listRecent(undefined)).toEqual([]);
  });
});
