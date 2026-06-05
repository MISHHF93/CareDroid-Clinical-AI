import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { TenantContextInterceptor } from './tenant-context.interceptor';

describe('TenantContextInterceptor', () => {
  const tenantContextService = {
    resolveForRequest: jest.fn(),
  };
  const next = { handle: jest.fn(() => of('ok')) };

  const buildContext = (request: any) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContextService.resolveForRequest.mockResolvedValue({
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: 'physician',
      subscriptionPlan: 'institutional',
      source: 'resolved',
      isDemoTenant: false,
    });
  });

  it('attaches tenant context to authenticated requests', async () => {
    const request: any = {
      user: { id: 'user-1' },
      headers: {},
      method: 'GET',
      originalUrl: '/api/ai/usage',
    };
    const interceptor = new TenantContextInterceptor(tenantContextService as any);

    await interceptor.intercept(buildContext(request), next as any);

    expect(tenantContextService.resolveForRequest).toHaveBeenCalledWith(request.user, {});
    expect(request.tenantContext).toMatchObject({
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
    });
    expect(next.handle).toHaveBeenCalled();
  });

  it('skips unauthenticated requests', async () => {
    const request = {
      headers: {},
      method: 'GET',
      originalUrl: '/api/subscriptions/plans',
    };
    const interceptor = new TenantContextInterceptor(tenantContextService as any);

    await interceptor.intercept(buildContext(request), next as any);

    expect(tenantContextService.resolveForRequest).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalled();
  });

  it('propagates tenant resolution failures for authenticated feature requests', async () => {
    tenantContextService.resolveForRequest.mockRejectedValue(
      new ForbiddenException('Organization context is required.'),
    );
    const request = {
      user: { id: 'user-1' },
      headers: {},
      method: 'GET',
      originalUrl: '/api/ai/usage',
    };
    const interceptor = new TenantContextInterceptor(tenantContextService as any);

    await expect(interceptor.intercept(buildContext(request), next as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
