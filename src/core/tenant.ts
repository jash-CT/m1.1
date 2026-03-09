import type { Request } from 'express';

export type TenantId = string;
export type RegionId = string;

export interface TenantContext {
  tenantId: TenantId;
  regionId?: RegionId;
  teamId?: string;
}

const TENANT_HEADER = 'x-tenant-id';
const REGION_HEADER = 'x-region-id';
const TEAM_HEADER = 'x-team-id';

export function getTenantFromRequest(req: Request): TenantContext | null {
  const tenantId = req.headers[TENANT_HEADER];
  if (typeof tenantId !== 'string' || !tenantId) return null;
  return {
    tenantId,
    regionId: (req.headers[REGION_HEADER] as string) ?? undefined,
    teamId: (req.headers[TEAM_HEADER] as string) ?? undefined,
  };
}

export function requireTenant(req: Request): TenantContext {
  const ctx = getTenantFromRequest(req);
  if (!ctx) throw new Error('Missing x-tenant-id header');
  return ctx;
}
