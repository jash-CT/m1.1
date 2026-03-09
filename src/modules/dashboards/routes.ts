import { Router, type Request } from 'express';
import { getKpis, getRegionSummaries } from '../analytics/service.js';
import { listOrders } from '../orders/store.js';
import { listUsers } from '../onboarding/store.js';

const router = Router();

/** Internal ops dashboard: KPIs + recent orders + user summary (optionally scoped by region/team) */
router.get('/ops', (req: Request & { tenant?: { tenantId: string; regionId?: string; teamId?: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const regionId = (req.query.regionId as string) ?? tenant.regionId;
  const teamId = (req.query.teamId as string) ?? tenant.teamId;
  const kpis = getKpis(tenant.tenantId, regionId);
  const regions = getRegionSummaries(tenant.tenantId);
  const recentOrders = listOrders(tenant.tenantId, { regionId, limit: 20, offset: 0 });
  const users = listUsers(tenant.tenantId, { regionId, teamId });
  res.json({
    kpis,
    regions,
    recentOrders,
    userSummary: {
      total: users.length,
      byRole: users.reduce<Record<string, number>>((acc, u) => {
        acc[u.role] = (acc[u.role] ?? 0) + 1;
        return acc;
      }, {}),
    },
  });
});

/** Team-specific dashboard (filter by teamId) */
router.get('/team', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const teamId = req.query.teamId as string;
  if (!teamId) return res.status(400).json({ error: 'teamId required' });
  const users = listUsers(tenant.tenantId, { teamId });
  const orders = listOrders(tenant.tenantId, { limit: 50 }).filter(
    (o) => (o as { teamId?: string }).teamId === teamId || !(o as { teamId?: string }).teamId
  );
  res.json({
    teamId,
    users,
    orderCount: orders.length,
    recentOrders: orders.slice(0, 10),
  });
});

/** Regional dashboard */
router.get('/region', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const regionId = req.query.regionId as string;
  if (!regionId) return res.status(400).json({ error: 'regionId required' });
  const kpis = getKpis(tenant.tenantId, regionId);
  const orders = listOrders(tenant.tenantId, { regionId, limit: 50 });
  const users = listUsers(tenant.tenantId, { regionId });
  res.json({
    regionId,
    kpis,
    orderCount: orders.length,
    userCount: users.length,
    recentOrders: orders.slice(0, 10),
  });
});

export default router;
