import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/index.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp(): Express {
  const app = express();

  // Request ID injection
  app.use(requestIdMiddleware);

  // Basic security and parsing middleware
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request telemetry
  app.use(requestLogger);

  // Mount API router
  app.use(config.apiPrefix, apiRouter);

  // Fallback for root route
  app.get('/', (_req, res) => {
    res.json({
      name: 'Sentinel 2.0 API',
      description: 'Runtime Control Layer for AI Agents',
      health: `${config.apiPrefix}/health`
    });
  });

  // 404 & centralized error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
