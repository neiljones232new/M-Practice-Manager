import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class DatabaseUnavailableExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseUnavailableExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const message = exception instanceof Error ? exception.message : String(exception);

    if (this.isDatabaseUnavailableError(message)) {
      this.logger.warn(`Returning 503 for DB unavailable error on ${request?.method} ${request?.url}`);
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message: 'Database unavailable',
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();
      response.status(status).json(errorResponse);
      return;
    }

    this.logger.error(`Unhandled exception on ${request?.method} ${request?.url}`, message);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
  }

  private isDatabaseUnavailableError(message: string): boolean {
    const lowered = String(message || '').toLowerCase();
    return (
      lowered.includes("can't reach database server") ||
      lowered.includes('failed to connect to database') ||
      lowered.includes('connection refused') ||
      lowered.includes('database is unavailable') ||
      lowered.includes('prismaclientinitializationerror') ||
      lowered.includes('timeout')
    );
  }
}
