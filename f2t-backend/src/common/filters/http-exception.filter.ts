import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>).message ||
          (exceptionResponse as Record<string, unknown>).error ||
          'Internal server error'
        : typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exception instanceof Error
            ? exception.message
            : 'Internal server error';

    response.status(status).json({
      success: false,
      data: null,
      message: Array.isArray(message)
        ? (message[0] as string)
        : (message as string),
    });
  }
}
