import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';
import { recordBackendErrorTelemetry } from '../observability/platform-telemetry-sink';
import { incidentReportingService } from '../../services/incident-reporting.service';

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

    // Architect Mode Stage C: align error envelope with FE ErrorCode taxonomy.
    const errorCode =
      typeof details.errorCode === 'string'
        ? details.errorCode
        : status === HttpStatus.BAD_REQUEST
          ? 'VALIDATION'
          : status === HttpStatus.UNAUTHORIZED
            ? 'UNAUTHORIZED'
            : status === HttpStatus.FORBIDDEN
              ? 'FORBIDDEN'
              : status === HttpStatus.NOT_FOUND
                ? 'NOT_FOUND'
                : status === HttpStatus.CONFLICT
                  ? 'CONFLICT'
                  : status === HttpStatus.TOO_MANY_REQUESTS
                    ? 'RATE_LIMIT'
                    : status === HttpStatus.GATEWAY_TIMEOUT
                      ? 'TIMEOUT'
                      : status === HttpStatus.SERVICE_UNAVAILABLE
                        ? 'DEPENDENCY_UNAVAILABLE'
                        : status === HttpStatus.UNPROCESSABLE_ENTITY
                          ? 'AI_SAFETY_REJECTION'
                          : status >= 500
                            ? 'INTERNAL'
                            : details.error || HttpStatus[status] || 'UNKNOWN';

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

      // Every unhandled 5xx response is exactly what IncidentReportingService exists to
      // track, but nothing anywhere in the app ever called reportIncident() before this --
      // its openIncidents/escalationRecipients health-check counters were permanently zero
      // regardless of real backend errors. This is the service's first real caller.
      incidentReportingService.reportIncident({
        serviceName: 'backend-api',
        severity: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'critical' : 'high',
        summary: `${request.method} ${request.originalUrl} -> ${status}: ${message}`,
        patientId:
          typeof request.params?.patientId === 'string' ? request.params.patientId : undefined,
        reportedBy: 'api-exception-filter',
        metadata: {
          errorCode,
          correlationId: correlationId || undefined,
          requestId: requestId || undefined,
        },
      });
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        details: Array.isArray(details.message) ? details.message : details.details,
        statusCode: status,
        path: request.originalUrl,
        correlationId: correlationId || undefined,
        retryable: status === 429 || status === 503 || status === 504,
      },
    });
  }
}
