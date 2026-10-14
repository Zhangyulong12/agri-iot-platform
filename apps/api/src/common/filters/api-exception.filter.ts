import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const path = request.originalUrl.split('?')[0] ?? request.path;
    let status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    const code =
      typeof exception === 'object' && exception !== null && 'code' in exception
        ? String(exception.code)
        : '';
    if (
      ['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'ECONNREFUSED', 'ECONNRESET'].includes(
        code,
      )
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = '数据库暂不可用，请稍后重试';
      error = 'Service Unavailable';
    }
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else {
        const details = body as { message?: string | string[]; error?: string };
        message = details.message ?? exception.message;
        error = details.error ?? exception.name;
      }
    }
    if (status >= 500) {
      // Do not log request bodies, database URLs, or exception messages containing secrets.
      this.logger.error(`Request failed: ${request.method} ${path}; status=${status}`);
      if (status === 500) message = 'Internal server error';
    }
    response.status(status).json({
      statusCode: status,
      error,
      message,
      path,
      timestamp: new Date().toISOString(),
    });
  }
}
