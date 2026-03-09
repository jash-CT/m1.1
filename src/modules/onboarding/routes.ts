import { Router, type Request } from 'express';
import { z } from 'zod';
import { createUser, getUser, listUsers, updateUserStatus } from './store.js';
import { getOnboardingStats } from './store.js';
import type { Role } from './types.js';

const router = Router();

const createBody = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'team_lead', 'regional', 'member']),
  regionId: z.string().optional(),
  teamId: z.string().optional(),
});

router.post('/users', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = createUser(tenant.tenantId, parsed.data);
  res.status(201).json(user);
});

router.get('/users', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const role = req.query.role as Role | undefined;
  const regionId = req.query.regionId as string | undefined;
  const teamId = req.query.teamId as string | undefined;
  const users = listUsers(tenant.tenantId, { role, regionId, teamId });
  res.json({ users });
});

router.get('/users/:userId', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const user = getUser(tenant.tenantId, req.params.userId);
  if (!user) return res.status(404).json({ error: 'Not Found' });
  res.json(user);
});

const statusBody = z.object({ status: z.enum(['pending', 'active', 'suspended']) });
router.patch('/users/:userId/status', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const parsed = statusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = updateUserStatus(tenant.tenantId, req.params.userId, parsed.data.status);
  if (!user) return res.status(404).json({ error: 'Not Found' });
  res.json(user);
});

router.get('/stats', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const users = getOnboardingStats(tenant.tenantId);
  const byRole: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  let pending = 0;
  let active = 0;
  for (const u of users) {
    byRole[u.role] = (byRole[u.role] ?? 0) + 1;
    if (u.regionId) byRegion[u.regionId] = (byRegion[u.regionId] ?? 0) + 1;
    if (u.status === 'pending') pending++;
    else if (u.status === 'active') active++;
  }
  res.json({
    total: users.length,
    byRole,
    byRegion,
    pending,
    active,
  });
});

export default router;
