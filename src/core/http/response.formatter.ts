import { Response } from 'express';
import { HttpStatus } from '../../constants/status.constants.js';
import { getRequestId } from './request-context.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export class ResponseFormatter {
  public static success<T>(
    res: Response,
    data: T,
    statusCode: HttpStatus = HttpStatus.OK,
    meta?: Record<string, unknown>,
  ): Response {
    const payload: ApiResponse<T> = {
      success: true,
      data,
      ...(meta ? { meta } : {}),
      requestId: getRequestId(),
    };

    return res.status(statusCode).json(payload);
  }

  /**
   * Error envelope, symmetric with success(). Keeps a single response shape
   * for the frontend (`{ success: false, error: { code, message } }`) instead
   * of each controller inventing its own.
   */
  public static failure(
    res: Response,
    message: string,
    statusCode: HttpStatus | number = HttpStatus.BAD_REQUEST,
    code = 'REQUEST_FAILED',
    details: unknown[] = [],
  ): Response {
    return res.status(statusCode).json({
      success: false,
      error: { code, message, details },
      requestId: getRequestId(),
    });
  }
}
