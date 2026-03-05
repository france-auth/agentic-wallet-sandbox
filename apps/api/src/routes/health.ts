import { Router } from 'express';
import { getConnection } from '../services/solana.js';
import { getDb } from '../services/db.js';
import { getHarnessStatus } from '../harness/runner.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  // DB check
  try {
    getDb().prepare('SELECT 1').get();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // RPC check
  try {
    await getConnection().getSlot();
    checks.solanaRpc = 'ok';
  } catch {
    checks.solanaRpc = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks,
    harness: getHarnessStatus(),
    timestamp: new Date().toISOString(),
  });
});
