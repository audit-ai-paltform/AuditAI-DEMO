import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppException } from './base.exception.js';
import { HttpStatus } from '../../constants/status.constants.js';
import { logger } from '../config/logger.config.js';
import { env } from '../config/env.config.js';
import { API_CONSTANTS } from '../../constants/api.constants.js';

export const globalExceptionHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const requestId = (req.headers[API_CONSTANTS.REQUEST_ID_HEADER] as string) || 'unknown';

  if (err instanceof AppException) {
    logger.warn({
      err,
      requestId,
      statusCode: err.statusCode,
      code: err.code,
      details: err.details,
      path: req.originalUrl,
      method: req.method,
    }, `[AppException] ${err.message}`);

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
      },
      requestId,
    });
    return;
  }

  // Unhandled / Internal Server Error
  logger.error({
    err,
    requestId,
    path: req.originalUrl,
    method: req.method,
  }, `[UnhandledException] ${err.message}`);

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'An internal server error occurred' : err.message,
      details: [],
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
    requestId,
  });
};
