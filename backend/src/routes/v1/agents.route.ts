import { Router, Request, Response, NextFunction } from 'express';
import { agentService } from '../../modules/agents/service.js';

const router = Router();

/**
 * POST /api/v1/agents
 * Registers a new agent
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await agentService.registerAgent(req.body);
    res.status(201).json({
      data: { agent },
      agent,
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/agents
 * Lists all registered agents
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = await agentService.listAgents();
    res.status(200).json({
      data: { agents },
      agents,
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/agents/:id
 * Retrieves a single agent by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await agentService.getAgent(req.params.id);
    res.status(200).json({
      data: { agent },
      agent,
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

export const agentsRouter = router;
