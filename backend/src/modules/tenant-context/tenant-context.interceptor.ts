import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { TenantContextRequest } from './tenant-context.types';
import { SKIP_TENANT_ISOLATION_KEY } from './tenant-scope.decorator';
import { isTenantBootstrapPath } from './tenant-scope.utils';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<TenantContextRequest>();
    if (!request.user || this.shouldSkipTenantResolution(context, request)) {
      return next.handle();
    }

    request.tenantContext = await this.tenantContextService.resolveForRequest(
      request.user,
      request.headers,
    );
    return next.handle();
  }

  /**
   * Must mirror TenantIsolationGuard's own skip check (SkipTenantIsolation
   * decorator OR the static bootstrap-path allowlist) -- previously this
   * only checked the bootstrap-path list, so @SkipTenantIsolation() silently
   * had no effect here: the guard would let a request through, but this
   * interceptor still resolved tenant context and threw regardless.
   */
  private shouldSkipTenantResolution(
    context: ExecutionContext,
    request: TenantContextRequest,
  ): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_ISOLATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return Boolean(skip) || isTenantBootstrapPath(request);
  }
}
