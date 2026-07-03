import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { MetricsService } from '../../modules/metrics/metrics.service';

function normalizeMetricPath(url: string): string {
  const path = url.split('?')[0] || '/';
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    const method = request.method;
    const path = normalizeMetricPath(request.originalUrl || request.url || '/');

    return next.handle().pipe(
      tap({
        next: () => {
          this.record(method, path, response.statusCode || 200, startedAt, request, response);
        },
        error: () => {
          this.record(method, path, response.statusCode || 500, startedAt, request, response);
        },
      }),
    );
  }

  private record(
    method: string,
    path: string,
    status: number,
    startedAt: number,
    request: Request,
    response: Response,
  ) {
    const durationMs = Date.now() - startedAt;
    const requestSize = Number(request.headers['content-length'] || 0) || undefined;
    const responseSize = Number(response.getHeader('content-length') || 0) || undefined;
    this.metricsService.recordHttpRequest(
      method,
      path,
      status,
      durationMs,
      requestSize,
      responseSize,
    );
    if (status >= 500) {
      this.metricsService.recordError('http_5xx', 'high');
    }
  }
}