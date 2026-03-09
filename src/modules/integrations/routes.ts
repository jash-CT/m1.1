import { Router, type Request, type Response } from 'express';
import { verifyWebhookSignature, getWebhookSignature, emitWebhookEvent, getRecentWebhookEvents } from './webhooks.js';

const router = Router();

/** Incoming webhook from third party (e.g. order status update). Verify signature then process. */
router.post('/webhooks/incoming', (req: Request & { rawBody?: Buffer }, res: Response) => {
  const rawBody = req.rawBody
    ? req.rawBody.toString()
    : JSON.stringify(req.body ?? {});
  const signature = getWebhookSignature(req);
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  let payload: unknown;
  try {
    payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  const type = (payload as { type?: string }).type ?? 'incoming.webhook';
  const tenantId = (payload as { tenantId?: string }).tenantId ?? (req.headers['x-tenant-id'] as string) ?? 'unknown';
  emitWebhookEvent(type, tenantId, payload);
  res.status(202).json({ received: true });
});

/** List recent webhook events for the tenant (for debugging / ops) */
router.get('/webhooks/events', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const limit = req.query.limit != null ? Math.min(100, parseInt(String(req.query.limit), 10)) : 50;
  const events = getRecentWebhookEvents(tenant.tenantId, limit);
  res.json({ events });
});

/** Outbound: trigger a webhook event (e.g. order.fulfilled) for third parties to consume */
router.post('/webhooks/emit', (req: Request & { tenant?: { tenantId: string } }, res) => {
  const tenant = req.tenant;
  if (!tenant) return res.status(400).json({ error: 'Missing tenant context' });
  const body = req.body as { type?: string; payload?: unknown };
  const type = body?.type ?? 'custom';
  emitWebhookEvent(type, tenant.tenantId, body?.payload ?? body);
  res.status(202).json({ emitted: type });
});

export default router;
