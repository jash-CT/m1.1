import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  createOrder,
  getOrder,
  listOrders,
  transitionOrder,
  setOrderExternalId,
} from './store.js';
import type { OrderStatus } from './types.js';

const router = Router();

const itemSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().min(0),
});

const createBody = z.object({
  regionId: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

router.post('/orders', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const order = createOrder(tenant.tenantId, parsed.data);
  res.status(201).json(order);
});

router.get('/orders', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const status = req.query.status as OrderStatus | undefined;
  const regionId = req.query.regionId as string | undefined;
  const limit = req.query.limit != null ? parseInt(String(req.query.limit), 10) : undefined;
  const offset = req.query.offset != null ? parseInt(String(req.query.offset), 10) : undefined;
  const orders = listOrders(tenant.tenantId, { status, regionId, limit, offset });
  res.json({ orders });
});

router.get('/orders/:orderId', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const order = getOrder(tenant.tenantId, req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Not Found' });
  res.json(order);
});

const transitionBody = z.object({
  status: z.enum(['submitted', 'validated', 'fulfilling', 'fulfilled', 'cancelled']),
});
router.patch('/orders/:orderId/status', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const parsed = transitionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const order = transitionOrder(tenant.tenantId, req.params.orderId, parsed.data.status as OrderStatus);
  if (!order) return res.status(404).json({ error: 'Not Found' });
  res.json(order);
});

const externalIdBody = z.object({ externalId: z.string().min(1) });
router.patch('/orders/:orderId/external-id', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const parsed = externalIdBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const order = setOrderExternalId(tenant.tenantId, req.params.orderId, parsed.data.externalId);
  if (!order) return res.status(404).json({ error: 'Not Found' });
  res.json(order);
});

export default router;
