import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { UsageEventType } from './subscription-plans.config';
import { UsageMeteringService } from './usage-metering.service';

const SKIPPED_PATH_PREFIXES = [
  '/api/subscriptions/usage',
  '/api/subscriptions/billing',
  '/api/subscriptions/webhook',
  '/metrics',
  '/health',
];

@Injectable()
export class UsageMeteringInterceptor implements NestInterceptor {
  constructor(private readonly usageMeteringService: UsageMeteringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const path = (request.originalUrl || request.url || request.path || '').split('?')[0];
    const shouldSkip = SKIPPED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));

    return next.handle().pipe(
      tap(() => {
        if (shouldSkip || !request.tenantContext?.organizationId) return;
        void this.usageMeteringService.recordFromTenantContext(
          request.tenantContext,
          UsageEventType.API_CALL,
          {
            metadata: {
              method: request.method,
              path,
              statusCode: context.switchToHttp().getResponse()?.statusCode,
            },
          },
        );
      }),
    );
  }
}
