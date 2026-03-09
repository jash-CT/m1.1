import type { Request, Response, NextFunction } from 'express';
import { getTenantFromRequest, requireTenant, type TenantContext } from './tenant.js';
import { logger } from './logger.js';

export function tenantMiddleware(
  req: Request & { tenant?: TenantContext },
  _res: Response,
  next: NextFunction
): void {
  req.tenant = getTenantFromRequest(req) ?? undefined;
  next();
}

export function requireTenantMiddleware(
  req: Request & { tenant?: TenantContext },
  _res: Response,
  next: NextFunction
): void {
  try {
    req.tenant = requireTenant(req);
    next();
  } catch (e) {
    next(e);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err: err.message }, 'Request error');
  const status =
    err.message === 'Unauthorized' ? 401
    : err.message === 'Forbidden' ? 403
    : err.message === 'Not Found' ? 404
    : 500;
  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : err.message,
  });
}
