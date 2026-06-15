import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCodes } from '../constants/error-codes.constant';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ErrorCodes.INTERNAL_ERROR;
    let message = 'An unexpected error occurred';
    let errors: unknown[] = [];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, any>;
        errorCode = body['errorCode'] ?? this.statusToErrorCode(statusCode);
        message = body['message'] ?? message;
        errors = body['errors'] ?? body['message'] ?? [];
        if (typeof errors === 'string') errors = [errors];
        // class-validator errors arrive as array under 'message'
        if (Array.isArray(body['message'])) {
          errors = body['message'];
          message = 'Validation failed';
          errorCode = ErrorCodes.VALIDATION_ERROR;
        }
      } else {
        message = exceptionResponse as string;
      }
    } else {
      this.logger.error('Unhandled exception', exception);
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      errorCode,
      message,
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private statusToErrorCode(status: number): string {
    const map: Record<number, string> = {
      400: ErrorCodes.VALIDATION_ERROR,
      401: ErrorCodes.UNAUTHORIZED,
      403: ErrorCodes.FORBIDDEN,
      404: ErrorCodes.NOT_FOUND,
      409: ErrorCodes.ALREADY_EXISTS,
      422: ErrorCodes.VALIDATION_ERROR,
      429: ErrorCodes.TOO_MANY_REQUESTS,
    };
    return map[status] ?? ErrorCodes.INTERNAL_ERROR;
  }
}
