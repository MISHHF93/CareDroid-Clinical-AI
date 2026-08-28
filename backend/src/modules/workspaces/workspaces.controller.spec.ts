import { WorkspacesController } from './workspaces.controller';

/**
 * Regression for a real entitlement-bypass bug: create() never forwarded
 * req.tenantContext.organizationId to the service, so every self-service
 * workspace was created with organizationId undefined -- and
 * validateEnabledToolIdsForOrganization() skips SaaS tool-entitlement
 * enforcement entirely whenever organizationId is falsy.
 */
describe('WorkspacesController.create', () => {
  it('forwards the request tenant context organizationId to createWorkspace', async () => {
    const createWorkspace = jest.fn().mockResolvedValue({ id: 'workspace-1' });
    const controller = new WorkspacesController(
      { createWorkspace } as any,
      {} as any,
    );

    const req = {
      user: { id: 'user-1' },
      tenantContext: { organizationId: 'org-a' },
    } as any;
    const dto = { type: 'clinical', name: 'My workspace' } as any;

    await controller.create(req, dto);

    expect(createWorkspace).toHaveBeenCalledWith(req.user, dto, { organizationId: 'org-a' });
  });

  it('passes null organizationId when no tenant context is present, rather than silently omitting it', async () => {
    const createWorkspace = jest.fn().mockResolvedValue({ id: 'workspace-1' });
    const controller = new WorkspacesController(
      { createWorkspace } as any,
      {} as any,
    );

    const req = { user: { id: 'user-1' } } as any;
    const dto = { type: 'clinical', name: 'My workspace' } as any;

    await controller.create(req, dto);

    expect(createWorkspace).toHaveBeenCalledWith(req.user, dto, { organizationId: null });
  });
});
