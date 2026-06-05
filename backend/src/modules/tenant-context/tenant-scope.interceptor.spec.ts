import { of } from 'rxjs';
import { SKIP_TENANT_ISOLATION_KEY } from './tenant-scope.decorator';
import { TenantScopeInterceptor } from './tenant-scope.interceptor';

describe('TenantScopeInterceptor', () => {
  const buildInterceptor = (skip = false) =>
    new TenantScopeInterceptor({
      getAllAndOverride: jest.fn((key: string) =>
        key === SKIP_TENANT_ISOLATION_KEY ? skip : undefined,
      ),
    } as any);

  const next = { handle: jest.fn(() => of('ok')) };

  const buildContext = (request: any) =>
    ({
      getType: () => 'http',
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts tenant scope from route params', () => {
    const request: any = {
      params: { organizationId: 'org-1', workspaceId: 'workspace-1' },
      headers: {},
      method: 'GET',
      originalUrl: '/api/workspaces/workspace-1',
    };
    const interceptor = buildInterceptor();

    interceptor.intercept(buildContext(request), next as any);

    expect(request.tenantScope).toEqual({
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      source: 'params',
    });
  });

  it('extracts tenant scope from query/body when params are absent', () => {
    const request: any = {
      query: { organizationId: 'org-query' },
      body: { workspaceId: 'workspace-body' },
      headers: {},
      method: 'GET',
      originalUrl: '/api/platform/digital-twin',
    };
    const interceptor = buildInterceptor();

    interceptor.intercept(buildContext(request), next as any);

    expect(request.tenantScope).toEqual({
      organizationId: 'org-query',
      workspaceId: 'workspace-body',
      source: 'query',
    });
  });

  it('skips explicit tenant isolation skip routes', () => {
    const request: any = {
      params: { organizationId: 'org-1' },
      headers: {},
      method: 'POST',
      originalUrl: '/api/organizations',
    };
    const interceptor = buildInterceptor(true);

    interceptor.intercept(buildContext(request), next as any);

    expect(request.tenantScope).toBeUndefined();
    expect(next.handle).toHaveBeenCalled();
  });
});
