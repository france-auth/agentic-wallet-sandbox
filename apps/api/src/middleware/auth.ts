import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-api-key'];
  if (!provided || provided !== config.API_KEY) {
    logger.warn({ ip: req.ip, path: req.path }, 'Unauthorized: invalid or missing API key');
    res.status(401).json({ error: 'Unauthorized: missing or invalid x-api-key header' });
    return;
  }
  next();
}
