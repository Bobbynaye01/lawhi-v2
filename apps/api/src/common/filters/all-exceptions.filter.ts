import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Single error shape for every failure. Internal errors are logged with their
 * stack but the client only ever receives a generic message — never a stack
 * trace, SQL, token or configuration detail.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        response.status(status).json({ statusCode: status, error: 'rate_limited' });
        return;
      }
      const body = exception.getResponse();
      const payload =
        typeof body === 'string'
          ? { error: body }
          : { error: (body as { error?: string; message?: unknown }).error ?? 'error', ...(body as object) };
      delete (payload as { statusCode?: number }).statusCode;
      response.status(status).json({ statusCode: status, ...payload });
      return;
    }

    this.logger.error(
      `${request.method} ${request.originalUrl}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: 'internal_error' });
  }
}
