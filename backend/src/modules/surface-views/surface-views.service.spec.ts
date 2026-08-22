import { SurfaceViewsService } from './surface-views.service';
import type { SurfaceViewEntity } from './entities/surface-view.entity';

class FakeSurfaceViewRepository {
  rows: SurfaceViewEntity[] = [];

  create(partial: Partial<SurfaceViewEntity>): SurfaceViewEntity {
    return { ...partial } as SurfaceViewEntity;
  }

  async findOne(options: { where: Partial<SurfaceViewEntity> }): Promise<SurfaceViewEntity | null> {
    const where = options.where;
    return (
      this.rows.find((row) =>
        Object.entries(where).every(
          ([key, value]) => (row as unknown as Record<string, unknown>)[key] === value,
        ),
      ) ?? null
    );
  }

  async save(entity: SurfaceViewEntity): Promise<SurfaceViewEntity> {
    entity.viewedAt = new Date();
    const existingIndex = this.rows.findIndex(
      (row) => row.userId === entity.userId && row.surfaceKey === entity.surfaceKey,
    );
    if (existingIndex >= 0) {
      this.rows[existingIndex] = entity;
    } else {
      this.rows.push(entity);
    }
    return entity;
  }

  async find(options: { where: Partial<SurfaceViewEntity> }): Promise<SurfaceViewEntity[]> {
    const where = options.where;
    return this.rows.filter((row) =>
      Object.entries(where).every(
        ([key, value]) => (row as unknown as Record<string, unknown>)[key] === value,
      ),
    );
  }
}

function makeService() {
  const repo = new FakeSurfaceViewRepository();
  const service = new SurfaceViewsService(
    repo as unknown as import('typeorm').Repository<SurfaceViewEntity>,
  );
  return { repo, service };
}

describe('SurfaceViewsService', () => {
  it('returns null previousViewedAt the first time a user touches a surface', async () => {
    const { service } = makeService();

    const result = await service.touch('care-operations-inbox', 'user-1', 'org-a');

    expect(result.previousViewedAt).toBeNull();
    expect(result.surfaceKey).toBe('care-operations-inbox');
    expect(new Date(result.viewedAt).getTime()).not.toBeNaN();
  });

  it('returns the prior viewedAt (not null) on a second touch of the same surface', async () => {
    const { service } = makeService();

    const first = await service.touch('care-operations-inbox', 'user-1', 'org-a');
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await service.touch('care-operations-inbox', 'user-1', 'org-a');

    expect(second.previousViewedAt).toBe(first.viewedAt);
    expect(new Date(second.viewedAt).getTime()).toBeGreaterThan(new Date(first.viewedAt).getTime());
  });

  it('keeps last-viewed state independent per surfaceKey for the same user', async () => {
    const { service, repo } = makeService();

    await service.touch('care-operations-inbox', 'user-1', 'org-a');
    const secondSurface = await service.touch('shift-summary', 'user-1', 'org-a');

    expect(secondSurface.previousViewedAt).toBeNull();
    expect(repo.rows).toHaveLength(2);
  });

  it('keeps last-viewed state independent per user for the same surface', async () => {
    const { service } = makeService();

    await service.touch('care-operations-inbox', 'user-1', 'org-a');
    const otherUser = await service.touch('care-operations-inbox', 'user-2', 'org-a');

    expect(otherUser.previousViewedAt).toBeNull();
  });

  it('listForUser returns only the caller’s own rows, across every surface they have touched', async () => {
    const { service } = makeService();

    await service.touch('care-operations-inbox', 'user-1', 'org-a');
    await service.touch('shift-summary', 'user-1', 'org-a');
    await service.touch('care-operations-inbox', 'user-2', 'org-a');

    const rows = await service.listForUser('user-1');

    expect(rows.map((row) => row.surfaceKey).sort()).toEqual([
      'care-operations-inbox',
      'shift-summary',
    ]);
  });

  it('truncates an over-long surfaceKey rather than letting it overflow the column', async () => {
    const { service } = makeService();
    const longKey = 'x'.repeat(200);

    const result = await service.touch(longKey, 'user-1', 'org-a');

    expect(result.surfaceKey.length).toBe(80);
  });
});
