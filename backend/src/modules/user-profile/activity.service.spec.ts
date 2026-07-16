import { UserActivityCategory } from '../user-activity/entities/user-activity.entity';
import { UserActivityService, UserActivitySummary } from '../user-activity/user-activity.service';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  const summary: UserActivitySummary = {
    recentCalculators: [],
    recentTools: [],
    recentAiChats: [],
    recentFleetActivity: [],
    recentIotActivity: [],
  };

  const activity = {
    id: 'activity-1',
    category: UserActivityCategory.TOOL,
    label: 'Sepsis pathway',
    route: '/emergency/tools/sepsis',
    workspaceId: 'workspace-1',
    occurredAt: new Date('2026-07-01T10:00:00.000Z'),
    metadata: { toolId: 'sepsis-pathway' },
  };

  const buildService = () => {
    const summaryForUser = jest.fn<
      ReturnType<UserActivityService['summaryForUser']>,
      Parameters<UserActivityService['summaryForUser']>
    >();
    const listForUser = jest.fn<
      ReturnType<UserActivityService['listForUser']>,
      Parameters<UserActivityService['listForUser']>
    >();
    const userActivityService = {
      summaryForUser,
      listForUser,
    } as unknown as UserActivityService;

    return {
      service: new ActivityService(userActivityService),
      summaryForUser,
      listForUser,
    };
  };

  it('returns the delegated summary for the requested user', async () => {
    const { service, summaryForUser } = buildService();
    summaryForUser.mockResolvedValue(summary);

    await expect(service.getSummary('user-1')).resolves.toBe(summary);
    expect(summaryForUser).toHaveBeenCalledWith('user-1');
  });

  it('combines the summary with the latest 30 activities', async () => {
    const { service, summaryForUser, listForUser } = buildService();
    summaryForUser.mockResolvedValue(summary);
    listForUser.mockResolvedValue([activity]);

    await expect(service.getActivity('user-1')).resolves.toEqual({
      summary,
      activities: [activity],
    });
    expect(summaryForUser).toHaveBeenCalledWith('user-1');
    expect(listForUser).toHaveBeenCalledWith('user-1', 30);
  });
});
