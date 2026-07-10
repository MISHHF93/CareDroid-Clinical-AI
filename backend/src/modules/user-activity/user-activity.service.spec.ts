import { ForbiddenException } from '@nestjs/common';
import { WorkspaceMembershipStatus } from '../workspaces/entities/workspace-membership.entity';
import { UserActivityService } from './user-activity.service';

describe('UserActivityService', () => {
  const buildService = (membership: any) => {
    const activityRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
      find: jest.fn(async () => []),
    };
    const membershipRepository = {
      findOne: jest.fn(async () => membership),
    };
    return new UserActivityService(activityRepository as any, membershipRepository as any);
  };

  describe('assertWorkspaceMember', () => {
    // GET /activity/workspaces/:workspaceId used to trust the workspaceId route param
    // with no membership check at all, letting any authenticated user read any other
    // workspace's activity feed. This locks in the fix.
    it('rejects a user with no active membership in the workspace', async () => {
      const service = buildService(null);

      await expect(service.assertWorkspaceMember('user-1', 'workspace-a')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows a user with an active membership in the workspace', async () => {
      const service = buildService({
        userId: 'user-1',
        workspaceId: 'workspace-a',
        status: WorkspaceMembershipStatus.ACTIVE,
      });

      await expect(service.assertWorkspaceMember('user-1', 'workspace-a')).resolves.toEqual(
        expect.objectContaining({ userId: 'user-1', workspaceId: 'workspace-a' }),
      );
    });
  });
});
