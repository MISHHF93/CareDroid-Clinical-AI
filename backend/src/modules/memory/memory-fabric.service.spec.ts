import { MemoryFabricService } from './memory-fabric.service';
import { MemoryFabricScope, MemoryFabricSignalType } from './memory-fabric.constants';

/**
 * HEAL-335: recordSignal() preferred a caller-supplied dto.workspaceId over
 * the resolved tenantContext.workspaceId. POST /memory/fabric/signals
 * (memory.controller.ts) passes the raw request body straight through as
 * `dto`, so a caller could misattribute a memory signal to a different
 * workspace within their own organization (organizationId itself was
 * already correctly server-derived with no client override at all).
 */
describe('MemoryFabricService.recordSignal workspace attribution (HEAL-335)', () => {
  function buildService() {
    const shortMemoryService = {
      remember: jest.fn().mockResolvedValue({ id: 'short-1' }),
    };
    const longMemoryService = {
      remember: jest.fn().mockResolvedValue({ id: 'long-1' }),
    };
    const userActivityService = {};
    const personalizationService = {};
    const artifactsService = {};
    const assetAccessService = {};
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const service = new MemoryFabricService(
      shortMemoryService as any,
      longMemoryService as any,
      userActivityService as any,
      personalizationService as any,
      artifactsService as any,
      assetAccessService as any,
      auditService as any,
    );

    return { service, shortMemoryService, longMemoryService };
  }

  it('uses the resolved tenantContext.workspaceId, not a caller-supplied override, for an AI_CONTEXT signal', async () => {
    const { service, shortMemoryService } = buildService();

    await service.recordSignal({
      user: { id: 'user-1' },
      dto: {
        scope: MemoryFabricScope.AI,
        signalType: MemoryFabricSignalType.AI_CONTEXT,
        title: 'test',
        workspaceId: 'attacker-claimed-workspace',
      } as any,
      tenantContext: { organizationId: 'org-1', workspaceId: 'real-workspace' },
    });

    expect(shortMemoryService.remember).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ workspaceId: 'real-workspace' }),
    );
  });

  it('uses the resolved tenantContext.workspaceId, not a caller-supplied override, for a non-AI_CONTEXT signal', async () => {
    const { service, longMemoryService } = buildService();

    await service.recordSignal({
      user: { id: 'user-1' },
      dto: {
        scope: MemoryFabricScope.WORKSPACE,
        signalType: MemoryFabricSignalType.PINNED_ASSET,
        title: 'test',
        workspaceId: 'attacker-claimed-workspace',
      } as any,
      tenantContext: { organizationId: 'org-1', workspaceId: 'real-workspace' },
    });

    expect(longMemoryService.remember).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ workspaceId: 'real-workspace' }),
    );
  });

  it('still falls back to the caller-supplied workspaceId when the tenant context has none', async () => {
    const { service, shortMemoryService } = buildService();

    await service.recordSignal({
      user: { id: 'user-1' },
      dto: {
        scope: MemoryFabricScope.AI,
        signalType: MemoryFabricSignalType.AI_CONTEXT,
        title: 'test',
        workspaceId: 'client-workspace',
      } as any,
      tenantContext: { organizationId: 'org-1' },
    });

    expect(shortMemoryService.remember).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ workspaceId: 'client-workspace' }),
    );
  });
});
