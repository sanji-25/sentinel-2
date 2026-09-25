import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config/index.js';
import { supabaseClient } from '../../database/client.js';

const router = Router();

/**
 * GET /api/v1/system/persistence
 * Returns current persistence status and storage driver details
 */
router.get('/persistence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = config.storageDriver;

    if (driver === 'supabase') {
      const health = await supabaseClient.checkHealth();
      res.status(200).json({
        provider: 'supabase',
        driver: 'supabase',
        connected: health.connected,
        status: health.connected ? 'connected' : 'degraded',
        details: health.message
      });
      return;
    }

    if (driver === 'local') {
      res.status(200).json({
        provider: 'local-storage',
        driver: 'local',
        connected: true,
        status: 'fallback',
        details: 'Using local disk JSON storage (survives restarts)'
      });
      return;
    }

    res.status(200).json({
      provider: 'memory',
      driver: 'memory',
      connected: true,
      status: 'fallback',
      details: 'Using in-memory repository (volatile/testing)'
    });
  } catch (err) {
    next(err);
  }
});

export const systemRouter = router;
