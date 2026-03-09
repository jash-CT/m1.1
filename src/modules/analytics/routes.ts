import { Router, type Request } from 'express';
import { getKpis, getRegionSummaries } from './service.js';

const router = Router();

router.get('/kpis', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const regionId = req.query.regionId as string | undefined;
  const kpis = getKpis(tenant.tenantId, regionId);
  res.json(kpis);
});

router.get('/regions', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const summaries = getRegionSummaries(tenant.tenantId);
  res.json({ regions: summaries });
});

export default router;
