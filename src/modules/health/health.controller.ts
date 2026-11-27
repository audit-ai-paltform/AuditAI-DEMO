import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { healthService } from './health.service.js';
import { HttpStatus } from '../../constants/status.constants.js';

export class HealthController extends BaseController {
  public getLive = (_req: Request, res: Response): Response => {
    const status = healthService.getLiveStatus();
    return this.ok(res, status);
  };

  public getReady = async (_req: Request, res: Response): Promise<Response> => {
    const status = await healthService.getReadyStatus();
    const httpStatus = status.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return ResponseFormatter.success(res, status, httpStatus);
  };
}

import { ResponseFormatter } from '../../core/http/response.formatter.js';
export const healthController = new HealthController();
