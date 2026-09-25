import { Router } from 'express';
import { agentsRouter } from './agents.route.js';
import { sessionsRouter } from './sessions.route.js';
import { actionsRouter } from './actions.route.js';

const v1Router = Router();

v1Router.use('/agents', agentsRouter);
v1Router.use('/sessions', sessionsRouter);
v1Router.use('/actions', actionsRouter);

export { v1Router };
