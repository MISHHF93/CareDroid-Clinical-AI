import { AnalyticsService } from './analytics.service';

describe('AnalyticsService tenant scoping', () => {
  const query = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
  };

  const repository = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => query),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.find.mockResolvedValue([]);
    query.getRawOne.mockResolvedValue({ count: '0' });
  });

  it('stores organization and workspace dimensions from event properties', async () => {
    const service = new AnalyticsService(repository as any);

    await service.trackEventsBulk([
      {
        event: 'asset_opened',
        userId: 'user-1',
        sessionId: 'session-1',
        properties: {
          organizationId: 'org-a',
          workspaceId: 'workspace-a',
        },
      },
    ]);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'asset_opened',
        userId: 'user-1',
        organizationId: 'org-a',
        workspaceId: 'workspace-a',
      }),
    );
  });

  it('filters metrics by organization when tenant context is provided', async () => {
    const service = new AnalyticsService(repository as any);

    await service.getEventMetrics(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-31T00:00:00.000Z'),
      undefined,
      'org-a',
    );

    expect(repository.find).toHaveBeenCalledWith({
      where: expect.objectContaining({ organizationId: 'org-a' }),
    });
    expect(query.andWhere).toHaveBeenCalledWith('event.organizationId = :organizationId', {
      organizationId: 'org-a',
    });
  });
});
