import { ForbiddenException } from '@nestjs/common';
import { UserActivityController } from './user-activity.controller';

describe('UserActivityController', () => {
  const buildController = (assertWorkspaceMember: jest.Mock) => {
    const service = {
      assertWorkspaceMember,
      listForWorkspace: jest.fn(async () => [{ id: 'activity-1' }]),
      record: jest.fn(async () => ({ id: 'activity-new' })),
    };
    return { controller: new UserActivityController(service as any), service };
  };

  // HEAL-347.31: POST /activity's dto.workspaceId is client-supplied and was
  // trusted with no membership check at all -- any authenticated user could
  // inject a fabricated activity entry into any other workspace's feed.
  describe('record', () => {
    it('rejects recording activity into a workspace the caller does not belong to', async () => {
      const assertWorkspaceMember = jest.fn(async () => {
        throw new ForbiddenException('Workspace membership is required.');
      });
      const { controller, service } = buildController(assertWorkspaceMember);

      await expect(
        controller.record(
          { user: { id: 'user-1' } },
          {
            category: 'navigation' as any,
            label: 'viewed page',
            workspaceId: 'workspace-b',
          },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(assertWorkspaceMember).toHaveBeenCalledWith('user-1', 'workspace-b');
      expect(service.record).not.toHaveBeenCalled();
    });

    it('records activity once membership is confirmed for the given workspace', async () => {
      const assertWorkspaceMember = jest.fn(async () => ({ status: 'active' }));
      const { controller, service } = buildController(assertWorkspaceMember);

      const dto = {
        category: 'navigation' as any,
        label: 'viewed page',
        workspaceId: 'workspace-a',
      };
      await expect(controller.record({ user: { id: 'user-1' } }, dto)).resolves.toEqual({
        id: 'activity-new',
      });
      expect(assertWorkspaceMember).toHaveBeenCalledWith('user-1', 'workspace-a');
      expect(service.record).toHaveBeenCalledWith('user-1', dto);
    });

    it('skips the membership check entirely when no workspaceId is supplied (personal activity)', async () => {
      const assertWorkspaceMember = jest.fn();
      const { controller, service } = buildController(assertWorkspaceMember);

      const dto = { category: 'navigation' as any, label: 'viewed page' };
      await controller.record({ user: { id: 'user-1' } }, dto);
      expect(assertWorkspaceMember).not.toHaveBeenCalled();
      expect(service.record).toHaveBeenCalledWith('user-1', dto);
    });
  });

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
