import { of, firstValueFrom } from 'rxjs';
import { UsageMeteringInterceptor } from './usage-metering.interceptor';

/**
 * HEAL-347.29: this interceptor is registered as a global APP_INTERCEPTOR
 * (subscriptions.module.ts) -- it runs once per authenticated API call
 * across the whole backend. Its usage-recording call was a bare
 * `void this.usageMeteringService.recordFromTenantContext(...)` with no
 * .catch(), so any rejection (a real DB write can fail on connection blips
 * or constraint errors) became an unhandled rejection recurring on every
 * request, not a one-off -- silently dropping billing events with zero
 * trace and, depending on process policy, a standing crash risk.
 */
describe('UsageMeteringInterceptor', () => {
  function buildContext(
    overrides: Partial<{ path: string; organizationId: string | undefined }> = {},
  ) {
    const request = {
      originalUrl: overrides.path ?? '/api/emergency/whiteboard',
      method: 'GET',
      tenantContext: overrides.organizationId
        ? { organizationId: overrides.organizationId }
        : overrides.organizationId === undefined
          ? { organizationId: 'org-1' }
          : undefined,
    };
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as any;
  }

  it('logs a warning instead of leaving the promise unhandled when recordFromTenantContext rejects', async () => {
    const usageMeteringService = {
      recordFromTenantContext: jest.fn().mockRejectedValue(new Error('connection reset')),
    };
    const interceptor = new UsageMeteringInterceptor(usageMeteringService as any);
    const loggerWarnSpy = jest
      .spyOn((interceptor as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const context = buildContext();
    const next = { handle: () => of('ok') };

    const result = await firstValueFrom(interceptor.intercept(context, next as any));
    expect(result).toBe('ok');

    // The tap() callback's fire-and-forget call is not awaited by intercept()
    // itself, so give its microtask a tick to run before asserting.
    await new Promise((resolve) => setImmediate(resolve));

    expect(usageMeteringService.recordFromTenantContext).toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('connection reset'));
  });

  it('does not call recordFromTenantContext for a skipped path', async () => {
    const usageMeteringService = { recordFromTenantContext: jest.fn() };
    const interceptor = new UsageMeteringInterceptor(usageMeteringService as any);

    const context = buildContext({ path: '/api/subscriptions/usage' });
    const next = { handle: () => of('ok') };

    await firstValueFrom(interceptor.intercept(context, next as any));
    await new Promise((resolve) => setImmediate(resolve));

    expect(usageMeteringService.recordFromTenantContext).not.toHaveBeenCalled();
  });

  it.each(['/api/emergency/realtime/stream', '/api/collaboration/realtime/stream'])(
    'does not bill the server-sent-event stream %s as an API call',
    async (path) => {
      const usageMeteringService = { recordFromTenantContext: jest.fn() };
      const interceptor = new UsageMeteringInterceptor(usageMeteringService as any);

      await firstValueFrom(
        interceptor.intercept(buildContext({ path }), { handle: () => of('ok') } as any),
      );
      await new Promise((resolve) => setImmediate(resolve));

      expect(usageMeteringService.recordFromTenantContext).not.toHaveBeenCalled();
    },
  );

  it('does not call recordFromTenantContext when there is no tenant context', async () => {
    const usageMeteringService = { recordFromTenantContext: jest.fn() };
    const interceptor = new UsageMeteringInterceptor(usageMeteringService as any);

    const context = buildContext({ organizationId: '' });
    const next = { handle: () => of('ok') };

    await firstValueFrom(interceptor.intercept(context, next as any));
    await new Promise((resolve) => setImmediate(resolve));

    expect(usageMeteringService.recordFromTenantContext).not.toHaveBeenCalled();
  });
});
