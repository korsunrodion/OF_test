import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      // getResponse() returns the full ValidationPipe error body, including per-field messages
      const body = exception.getResponse();
      message =
        typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>)['message']
          : body;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception instanceof Error ? exception.message : 'Internal server error';
    }

    const meta = { method: request.method, url: request.url, status, message };

    if (status >= 500) {
      this.logger.error(meta, 'Server error');
    } else {
      this.logger.warn(meta, 'Client error');
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
