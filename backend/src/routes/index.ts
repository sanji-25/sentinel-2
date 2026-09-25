import { Router } from 'express';
import { healthRouter } from './health.route.js';
import { v1Router } from './v1/index.js';

const apiRouter = Router();

// Mount foundational routes
apiRouter.use('/health', healthRouter);
apiRouter.use('/v1', v1Router);

export { apiRouter };
