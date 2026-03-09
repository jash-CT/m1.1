import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger.js';

const WEBHOOK_HEADER = 'x-webhook-signature';

export function verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
  const secret = config.webhookSecret;
  if (!secret) {
    logger.warn('Webhook signature verification skipped: WEBHOOK_SECRET not set');
    return false;
  }
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

export function getWebhookSignature(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const v = req.headers[WEBHOOK_HEADER];
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? null : null;
}

export interface WebhookEvent {
  id: string;
  type: string;
  tenantId: string;
  payload: unknown;
  createdAt: string;
}

const events: WebhookEvent[] = [];
const MAX_EVENTS = 1000;

export function emitWebhookEvent(type: string, tenantId: string, payload: unknown): void {
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  events.push({
    id,
    type,
    tenantId,
    payload,
    createdAt: new Date().toISOString(),
  });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  logger.info({ id, type, tenantId }, 'Webhook event emitted');
}

export function getRecentWebhookEvents(tenantId: string, limit = 50): WebhookEvent[] {
  return events
    .filter((e) => e.tenantId === tenantId)
    .slice(-limit)
    .reverse();
}
