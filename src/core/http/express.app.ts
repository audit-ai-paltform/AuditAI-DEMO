import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { env } from '../config/env.config.js';
import { logger } from '../config/logger.config.js';
import { corsOptions } from '../config/cors.config.js';
import { helmetOptions } from '../config/helmet.config.js';

import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { globalExceptionHandler } from '../exceptions/exception.handler.js';
import { NotFoundException } from '../exceptions/not-found.exception.js';
import { mainRouter } from '../../routes/index.js';
import { API_CONSTANTS } from '../../constants/api.constants.js';

export function createExpressApp(): Express {
  const app = express();

  // Trust Proxy configuration
  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  // Core Security & Compression Middlewares
  app.use(helmet(helmetOptions));
  app.use(cors(corsOptions));
  app.use(compression());

  // Body Parsing Middlewares with size limits
  app.use(express.json({ limit: env.BODY_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.BODY_SIZE_LIMIT }));

  // Request ID & Correlation Context Middleware
  app.use(requestIdMiddleware);

  // HTTP Request Logging Middleware using Pino
  app.use(
    pinoHttp({
      logger,
      customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
      },
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            headers: {
              'x-request-id': req.headers[API_CONSTANTS.REQUEST_ID_HEADER],
              'user-agent': req.headers['user-agent'],
            },
          };
        },
      },
    }),
  );

  // Mount API Versioned Routes (/api/v1, /api, and root fallback)
  app.use(env.API_PREFIX, mainRouter);
  app.use('/api', mainRouter);
  app.use('/', mainRouter);

  // Unmatched Route (404) Fallback
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundException(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Central Exception Handler
  app.use(globalExceptionHandler);

  return app;
}
