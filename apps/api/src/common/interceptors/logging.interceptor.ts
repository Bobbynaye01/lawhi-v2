import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/** One line per request: method, path (without query string), status, duration. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const started = Date.now();
    const path = request.originalUrl.split('?')[0];
    return next.handle().pipe(
      tap({
        next: () => this.log(request.method, path, http.getResponse<Response>().statusCode, started),
        error: () => this.log(request.method, path, 'error', started),
      }),
    );
  }

  private log(method: string, path: string | undefined, status: number | string, started: number) {
    this.logger.log(`${method} ${path} ${status} ${Date.now() - started}ms`);
  }
}
