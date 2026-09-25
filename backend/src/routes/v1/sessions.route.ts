import { Router, Request, Response, NextFunction } from 'express';
import { sessionService } from '../../modules/sessions/service.js';

const router = Router();

/**
 * POST /api/v1/sessions
 * Starts a new session for an agent
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionService.createSession(req.body);
    res.status(201).json({
      data: { session },
      session,
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sessions
 * Lists sessions (optionally filtered by ?agentId=)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = typeof req.query.agentId === 'string' ? req.query.agentId : undefined;
    const sessions = await sessionService.listSessions(agentId);
    res.status(200).json({
      data: { sessions },
      sessions,
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sessions/:id
 * Retrieves a single session by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionService.getSession(req.params.id);
    res.status(200).json({
      data: { session },
      session,
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/sessions/:id/end
 * Marks an active session as completed
 */
router.post('/:id/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionService.endSession(req.params.id);
    res.status(200).json({
      data: { session },
      session,
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

export const sessionsRouter = router;
