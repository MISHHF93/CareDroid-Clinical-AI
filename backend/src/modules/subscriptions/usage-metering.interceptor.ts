import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
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
  private readonly logger = new Logger(UsageMeteringInterceptor.name);

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
        // HEAL-347.29: this is a global APP_INTERCEPTOR (subscriptions.module.ts),
        // running once per authenticated API call across the whole backend, so
        // an unhandled rejection here isn't a one-off -- it's a recurring source
        // of silently-dropped billing events (and, depending on the process's
        // unhandledRejection policy, a standing crash risk) with zero trace.
        // recordFromTenantContext performs real DB writes that can reject
        // (connection blips, constraint errors); catch and log instead of
        // letting the promise reject unobserved.
        void this.usageMeteringService
          .recordFromTenantContext(request.tenantContext, UsageEventType.API_CALL, {
            source: path,
            metadata: {
              source: path,
              surface: 'api',
              method: request.method,
              path,
              statusCode: context.switchToHttp().getResponse()?.statusCode,
            },
          })
          .catch((error) => {
            this.logger.warn(
              `Failed to record usage event for ${path}: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
      }),
    );
  }
}
