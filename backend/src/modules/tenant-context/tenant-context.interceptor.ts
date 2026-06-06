import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { TenantContextRequest } from './tenant-context.types';
import { isTenantBootstrapPath } from './tenant-scope.utils';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContextService: TenantContextService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<TenantContextRequest>();
    if (!request.user || this.shouldSkipTenantResolution(request)) {
      return next.handle();
    }

    request.tenantContext = await this.tenantContextService.resolveForRequest(
      request.user,
      request.headers,
    );
    return next.handle();
  }

  private shouldSkipTenantResolution(request: TenantContextRequest): boolean {
    return isTenantBootstrapPath(request);
  }
}
