import { UnauthorizedException } from '@nestjs/common';
import { JwtQueryAuthGuard } from './jwt-query-auth.guard';

describe('JwtQueryAuthGuard', () => {
  const buildGuard = (verifyImpl: (token: string) => unknown) => {
    const jwtService = { verify: jest.fn(verifyImpl) };
    return { guard: new JwtQueryAuthGuard(jwtService as any), jwtService };
  };

  const buildContext = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;

  it('sets request.user.id from the JWT sub claim, not just the raw payload', () => {
    // Regression: TenantIsolationGuard/TenantContextInterceptor are globally
    // registered (tenant-context.module.ts) and run on every route including
    // this one. TenantContextService.resolveForRequest requires `user.id`,
    // but this app's JWTs only ever carry `sub` (see auth.service.ts). The
    // normal AuthGuard('jwt') path never hits this because Passport's
    // JwtStrategy.validate() looks up the real User row and returns an
    // `id`-bearing entity -- this guard bypasses Passport entirely (SSE via
    // EventSource can't send an Authorization header), so it must map
    // sub -> id itself or every realtime connection 403s unconditionally.
    const { guard } = buildGuard(() => ({ sub: 'user-123', tokenUse: 'access' }));
    const request: any = { headers: {}, query: { token: 'a.b.c' } };

    expect(guard.canActivate(buildContext(request))).toBe(true);
    expect(request.user.id).toBe('user-123');
    expect(request.user.sub).toBe('user-123');
  });

  it('accepts a token passed via Authorization header', () => {
    const { guard } = buildGuard(() => ({ sub: 'user-456', tokenUse: 'access' }));
    const request: any = { headers: { authorization: 'Bearer a.b.c' }, query: {} };

    expect(guard.canActivate(buildContext(request))).toBe(true);
    expect(request.user.id).toBe('user-456');
  });

  it('throws when no token is present in either the header or the query string', () => {
    const { guard } = buildGuard(() => ({ sub: 'user-1' }));
    const request: any = { headers: {}, query: {} };

    expect(() => guard.canActivate(buildContext(request))).toThrow(UnauthorizedException);
  });

  it('throws when the token is not an access token', () => {
    const { guard } = buildGuard(() => ({ sub: 'user-1', tokenUse: 'refresh' }));
    const request: any = { headers: {}, query: { token: 'a.b.c' } };

    expect(() => guard.canActivate(buildContext(request))).toThrow(UnauthorizedException);
  });

  it('throws when the token fails verification', () => {
    const { guard } = buildGuard(() => {
      throw new Error('invalid signature');
    });
    const request: any = { headers: {}, query: { token: 'bad.token.here' } };

    expect(() => guard.canActivate(buildContext(request))).toThrow(UnauthorizedException);
  });
});
