import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let error = "INTERNAL_ERROR";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === "string") {
        message = exResponse;
      } else if (typeof exResponse === "object" && exResponse !== null) {
        const responseObj = exResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        error = (responseObj.error as string) || error;

        // Handle validation errors (class-validator)
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(", ");
          error = "VALIDATION_ERROR";
        }
      }

      // Map status to error code
      switch (status) {
        case 400:
          error = "BAD_REQUEST";
          break;
        case 401:
          error = "UNAUTHORIZED";
          break;
        case 403:
          error = "FORBIDDEN";
          break;
        case 404:
          error = "NOT_FOUND";
          break;
        case 409:
          error = "CONFLICT";
          break;
        case 422:
          error = "VALIDATION_ERROR";
          break;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      success: false,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
