import { v4 as uuid } from 'uuid';
import type { Order, OrderStatus, CreateOrderInput } from './types.js';

const store = new Map<string, Order>();

function key(tenantId: string, id: string): string {
  return `${tenantId}:${id}`;
}

function totalCents(items: Order['items']): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
}

export function createOrder(tenantId: string, input: CreateOrderInput): Order {
  const id = uuid();
  const now = new Date().toISOString();
  const order: Order = {
    id,
    tenantId,
    regionId: input.regionId,
    status: 'draft',
    items: input.items,
    totalCents: totalCents(input.items),
    createdAt: now,
    updatedAt: now,
  };
  store.set(key(tenantId, id), order);
  return order;
}

export function getOrder(tenantId: string, orderId: string): Order | undefined {
  return store.get(key(tenantId, orderId));
}

export function listOrders(
  tenantId: string,
  opts?: { status?: OrderStatus; regionId?: string; limit?: number; offset?: number }
): Order[] {
  const prefix = `${tenantId}:`;
  const list: Order[] = [];
  for (const [k, o] of store) {
    if (!k.startsWith(prefix)) continue;
    if (opts?.status && o.status !== opts.status) continue;
    if (opts?.regionId && o.regionId !== opts.regionId) continue;
    list.push(o);
  }
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? 50;
  return list.slice(offset, offset + limit);
}

export function transitionOrder(
  tenantId: string,
  orderId: string,
  toStatus: OrderStatus
): Order | undefined {
  const o = store.get(key(tenantId, orderId));
  if (!o) return undefined;
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    draft: ['submitted', 'cancelled'],
    submitted: ['validated', 'cancelled'],
    validated: ['fulfilling'],
    fulfilling: ['fulfilled'],
    fulfilled: [],
    cancelled: [],
  };
  if (!allowed[o.status]?.includes(toStatus)) return undefined;
  o.status = toStatus;
  o.updatedAt = new Date().toISOString();
  if (toStatus === 'fulfilled') o.fulfilledAt = o.updatedAt;
  return o;
}

export function setOrderExternalId(tenantId: string, orderId: string, externalId: string): Order | undefined {
  const o = store.get(key(tenantId, orderId));
  if (!o) return undefined;
  o.externalId = externalId;
  o.updatedAt = new Date().toISOString();
  return o;
}
