import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';
import { recordBackendErrorTelemetry } from '../observability/platform-telemetry-sink';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const details =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const message =
      typeof body === 'string'
        ? body
        : typeof details.message === 'string'
          ? details.message
          : Array.isArray(details.message)
            ? details.message.join('; ')
            : status === HttpStatus.INTERNAL_SERVER_ERROR
              ? 'Internal server error'
              : 'Request failed';

    const correlationId = String(request.headers['x-correlation-id'] || '');
    const requestId = String(request.headers['x-request-id'] || '');

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      recordBackendErrorTelemetry({
        name: exception instanceof Error ? exception.name : 'HttpException',
        message,
        path: request.originalUrl,
        statusCode: status,
        correlationId: correlationId || undefined,
        requestId: requestId || undefined,
        metadata: {
          method: request.method,
        },
      });
      if (exception instanceof Error) {
        Sentry.captureException(exception);
      } else {
        Sentry.captureMessage(message, 'error');
      }
    }

    response.status(status).json({
      success: false,
      error: {
        code: details.error || HttpStatus[status] || 'Error',
        message,
        details: Array.isArray(details.message) ? details.message : details.details,
        statusCode: status,
        path: request.originalUrl,
      },
    });
  }
}
