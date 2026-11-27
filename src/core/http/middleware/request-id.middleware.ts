import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { API_CONSTANTS } from '../../../constants/api.constants.js';
import { requestContextStore } from '../request-context.js';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers[API_CONSTANTS.REQUEST_ID_HEADER];
  const requestId = typeof existingId === 'string' && existingId.trim() ? existingId : uuidv4();

  req.headers[API_CONSTANTS.REQUEST_ID_HEADER] = requestId;
  res.setHeader(API_CONSTANTS.REQUEST_ID_HEADER, requestId);

  requestContextStore.run({ requestId }, () => {
    next();
  });
}
