import { listOrders } from '../orders/store.js';
import { getOnboardingStats } from '../onboarding/store.js';
import type { TenantId } from '../../core/tenant.js';

export interface KpiSnapshot {
  tenantId: TenantId;
  period: string;
  totalOrders: number;
  totalRevenueCents: number;
  ordersByStatus: Record<string, number>;
  activeUsers: number;
  pendingUsers: number;
}

export function getKpis(tenantId: TenantId, regionId?: string): KpiSnapshot {
  const orders = listOrders(tenantId, { regionId, limit: 10_000 });
  const users = getOnboardingStats(tenantId);
  const totalRevenueCents = orders
    .filter((o) => o.status === 'fulfilled')
    .reduce((s, o) => s + o.totalCents, 0);
  const ordersByStatus: Record<string, number> = {};
  for (const o of orders) {
    ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
  }
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const pendingUsers = users.filter((u) => u.status === 'pending').length;
  return {
    tenantId,
    period: new Date().toISOString().slice(0, 10),
    totalOrders: orders.length,
    totalRevenueCents,
    ordersByStatus,
    activeUsers,
    pendingUsers,
  };
}

export interface RegionSummary {
  regionId: string;
  orderCount: number;
  revenueCents: number;
  userCount: number;
}

export function getRegionSummaries(tenantId: TenantId): RegionSummary[] {
  const orders = listOrders(tenantId, { limit: 50_000 });
  const users = getOnboardingStats(tenantId);
  const byRegion = new Map<string, { orders: number; revenue: number; users: number }>();
  for (const o of orders) {
    const rid = o.regionId ?? '_default';
    const cur = byRegion.get(rid) ?? { orders: 0, revenue: 0, users: 0 };
    cur.orders += 1;
    if (o.status === 'fulfilled') cur.revenue += o.totalCents;
    byRegion.set(rid, cur);
  }
  for (const u of users) {
    const rid = u.regionId ?? '_default';
    const cur = byRegion.get(rid) ?? { orders: 0, revenue: 0, users: 0 };
    cur.users += 1;
    byRegion.set(rid, cur);
  }
  return Array.from(byRegion.entries()).map(([regionId, v]) => ({
    regionId: regionId === '_default' ? '' : regionId,
    orderCount: v.orders,
    revenueCents: v.revenue,
    userCount: v.users,
  }));
}
