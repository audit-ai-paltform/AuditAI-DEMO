import { Response } from 'express';
import { ResponseFormatter } from './response.formatter.js';
import { HttpStatus } from '../../constants/status.constants.js';

export abstract class BaseController {
  protected ok<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
    return ResponseFormatter.success(res, data, HttpStatus.OK, meta);
  }

  protected created<T>(res: Response, data: T): Response {
    return ResponseFormatter.success(res, data, HttpStatus.CREATED);
  }

  /** Standard error envelope — surfaced to the client with the real reason. */
  protected fail(
    res: Response,
    message: string,
    statusCode: HttpStatus | number = HttpStatus.BAD_REQUEST,
    code = 'REQUEST_FAILED',
  ): Response {
    return ResponseFormatter.failure(res, message, statusCode, code);
  }
}
