import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { recordBackendHttpTelemetry } from '../common/observability/platform-telemetry-sink';

/**
 * HTTP Request Logging Middleware
 * Captures request/response timing, status codes, and other metadata
 * Logs structured JSON for ELK aggregation
 * Also integrates with Sentry for transaction tracking
 */

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const logger = this.logger; // Save logger reference for use in nested function

    // Extract user ID if available (from JWT token in Authorization header)
    const authHeader = req.headers.authorization || '';
    const userId = this.extractUserIdFromToken(authHeader);

    // Store user ID in Sentry context for error tracking
    if (userId) {
      Sentry.setUser({ id: userId });
    }

    const correlationId =
      String(req.headers['x-correlation-id'] || req.header('x-correlation-id') || '') ||
      this.generateRequestId();
    const workflowTraceId = String(
      req.headers['x-workflow-trace-id'] || req.header('x-workflow-trace-id') || '',
    );
    const requestId =
      req.headers['x-request-id'] || req.header('x-trace-id') || this.generateRequestId();
    Sentry.setTag('request_id', String(requestId));
    Sentry.setTag('correlation_id', correlationId);
    if (workflowTraceId) {
      Sentry.setTag('workflow_trace_id', workflowTraceId);
    }
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-request-id', String(requestId));

    // Intercept response.end() to capture when response is sent
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Structured log entry
      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        correlationId,
        workflowTraceId: workflowTraceId || undefined,
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        durationMs: duration,
        ip,
        userId: userId || 'anonymous',
        contentLength: res.get('content-length') || 'unknown',
      };

      recordBackendHttpTelemetry({
        method,
        path: originalUrl.split('?')[0] || originalUrl,
        statusCode,
        durationMs: duration,
        correlationId,
        workflowTraceId: workflowTraceId || undefined,
        requestId: String(requestId),
        userId: userId || undefined,
      });

      // Log with appropriate level based on status code. A 503 from the
      // health endpoint is the endpoint doing its job (reporting "not ready"
      // while dependencies come up), not a server failure: during every boot
      // it produced three "Server Error" entries with a 12-field dump each
      // and three Sentry events, which buried real 5xx lines in the dev log.
      const isHealthProbe = /^\/(api\/)?health(\/|\?|$)/.test(originalUrl);
      if (statusCode >= 500 && isHealthProbe) {
        logger.warn(`Health probe answered ${statusCode} (dependencies not ready yet)`, {
          url: originalUrl,
          statusCode,
          duration,
        });
      } else if (statusCode >= 500) {
        logger.error('Server Error', logEntry);
        Sentry.captureMessage(`HTTP ${statusCode} - ${method} ${originalUrl}`, 'error');
      } else if (statusCode >= 400) {
        logger.warn('Client Error', logEntry);
      } else {
        logger.debug('Request Complete', logEntry);
      }

      // Add performance metric
      if (duration > 2000) {
        logger.warn(`Slow request detected: ${duration}ms for ${method} ${originalUrl}`);
        Sentry.captureMessage(`Slow request: ${duration}ms - ${method} ${originalUrl}`, 'warning');
      }

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  }

  /**
   * Extract user ID from JWT token
   * Simple extraction - in production, use proper JWT decoding
   */
  private extractUserIdFromToken(authHeader: string): string | null {
    try {
      if (!authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      // Basic JWT parsing (doesn't verify signature, just extracts payload)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      return decoded.sub || decoded.userId || null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Generate a unique request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
