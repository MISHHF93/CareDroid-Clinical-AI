import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtQueryAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const bearer =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length)
        : '';
    const queryToken = typeof request.query?.token === 'string' ? request.query.token : '';
    const token = bearer || queryToken;

    if (!token) {
      throw new UnauthorizedException('Missing access token for realtime stream.');
    }

    try {
      const payload = this.jwtService.verify(token, {
        ignoreExpiration: false,
      }) as { sub: string; tokenUse?: string };

      if (payload.tokenUse && payload.tokenUse !== 'access') {
        throw new UnauthorizedException('Invalid token type for realtime stream.');
      }

      // The globally-registered TenantIsolationGuard/TenantContextInterceptor
      // (tenant-context.module.ts, APP_GUARD/APP_INTERCEPTOR) run on every
      // route including this one, and TenantContextService.resolveForRequest
      // requires `user.id` -- but the JWT's own subject claim is `sub`, not
      // `id` (matching every token this app issues, see auth.service.ts).
      // The normal AuthGuard('jwt') path never hits this: Passport's
      // JwtStrategy.validate() looks up the real User row by `sub` and
      // returns it as `id`-bearing. This guard exists specifically because
      // EventSource can't send an Authorization header (token travels via
      // `?token=`), so it verifies the JWT directly instead of going through
      // Passport -- previously it set `request.user` to the raw payload
      // (only `sub`), which made every SSE connection fail tenant-context
      // resolution with a 403, unconditionally, for every user.
      (request as Request & { user?: unknown }).user = { ...payload, id: payload.sub };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}
