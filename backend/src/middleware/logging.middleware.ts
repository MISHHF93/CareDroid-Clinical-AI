import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

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

    // Add request ID for tracing
    const requestId =
      req.headers['x-request-id'] || req.header('x-trace-id') || this.generateRequestId();
    Sentry.setTag('request_id', String(requestId));

    // Intercept response.end() to capture when response is sent
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Structured log entry
      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userId: userId || 'anonymous',
        // Get response size if available
        contentLength: res.get('content-length') || 'unknown',
      };

      // Log with appropriate level based on status code
      if (statusCode >= 500) {
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
