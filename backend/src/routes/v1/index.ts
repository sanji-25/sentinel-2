import { Router } from 'express';
import { agentsRouter } from './agents.route.js';
import { sessionsRouter } from './sessions.route.js';
import { actionsRouter } from './actions.route.js';
import { auditRouter } from './audit.route.js';
import { systemRouter } from './system.route.js';
import { scenariosRouter } from './scenarios.route.js';
import { interventionsRouter } from './interventions.route.js';

const v1Router = Router();

v1Router.use('/agents', agentsRouter);
v1Router.use('/sessions', sessionsRouter);
v1Router.use('/actions', actionsRouter);
v1Router.use('/audit', auditRouter);
v1Router.use('/system', systemRouter);
v1Router.use('/scenarios', scenariosRouter);
v1Router.use('/interventions', interventionsRouter);

export { v1Router };
