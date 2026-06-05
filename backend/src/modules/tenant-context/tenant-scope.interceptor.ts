import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { SKIP_TENANT_ISOLATION_KEY } from './tenant-scope.decorator';
import { extractTenantScopeFromRequest, isTenantBootstrapPath } from './tenant-scope.utils';
import { TenantContextRequest } from './tenant-context.types';

@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<TenantContextRequest>();
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_ISOLATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!skip && !isTenantBootstrapPath(request)) {
      request.tenantScope = extractTenantScopeFromRequest(request);
    }

    return next.handle();
  }
}
