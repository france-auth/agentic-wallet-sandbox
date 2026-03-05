import rateLimit from 'express-rate-limit';

export const writeLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => req.headers['x-api-key'] as string ?? req.ip ?? 'unknown',
});

export const readLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
