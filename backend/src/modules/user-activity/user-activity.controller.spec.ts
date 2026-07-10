import { ForbiddenException } from '@nestjs/common';
import { UserActivityController } from './user-activity.controller';

describe('UserActivityController', () => {
  const buildController = (assertWorkspaceMember: jest.Mock) => {
    const service = {
      assertWorkspaceMember,
      listForWorkspace: jest.fn(async () => [{ id: 'activity-1' }]),
    };
    return { controller: new UserActivityController(service as any), service };
  };

  // GET /activity/workspaces/:workspaceId used to call listForWorkspace directly with
  // no membership check, so any authenticated user could read any workspace's feed by
  // guessing/enumerating workspaceId. This asserts the membership check runs first.
  it('rejects reading another workspace activity feed without membership', async () => {
    const assertWorkspaceMember = jest.fn(async () => {
      throw new ForbiddenException('Workspace membership is required.');
    });
    const { controller } = buildController(assertWorkspaceMember);

    await expect(
      controller.workspace({ user: { id: 'user-1' } }, 'workspace-b', undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(assertWorkspaceMember).toHaveBeenCalledWith('user-1', 'workspace-b');
  });

  it('returns workspace activity once membership is confirmed', async () => {
    const assertWorkspaceMember = jest.fn(async () => ({ status: 'active' }));
    const { controller, service } = buildController(assertWorkspaceMember);

    await expect(
      controller.workspace({ user: { id: 'user-1' } }, 'workspace-a', '10'),
    ).resolves.toEqual({ activities: [{ id: 'activity-1' }] });
    expect(service.listForWorkspace).toHaveBeenCalledWith('workspace-a', 10);
  });
});
