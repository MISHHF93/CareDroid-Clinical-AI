import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
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
