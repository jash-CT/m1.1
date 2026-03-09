import type { Request } from 'express';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const BEARER_PREFIX = 'bearer ';

export function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.toLowerCase().startsWith(BEARER_PREFIX))
    return null;
  return auth.slice(BEARER_PREFIX.length).trim();
}

export function validateApiKey(token: string): boolean {
  if (!token) return false;
  return token.length >= 32 && safeCompare(token, config.apiKey);
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function authMiddleware(
  req: Request,
  _res: unknown,
  next: (err?: Error) => void
): void {
  const token = getBearerToken(req as Request);
  if (!token) {
    logger.warn({ path: (req as Request).path }, 'Auth failure: missing token');
    next(new Error('Unauthorized'));
    return;
  }
  if (!validateApiKey(token)) {
    logger.warn({ path: (req as Request).path }, 'Auth failure: invalid token');
    next(new Error('Unauthorized'));
    return;
  }
  next();
}
