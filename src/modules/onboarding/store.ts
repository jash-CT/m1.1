import { v4 as uuid } from 'uuid';
import type { OnboardingUser, CreateUserInput, Role } from './types.js';

const store = new Map<string, OnboardingUser>();

function key(tenantId: string, id: string): string {
  return `${tenantId}:${id}`;
}

export function createUser(tenantId: string, input: CreateUserInput): OnboardingUser {
  const id = uuid();
  const now = new Date().toISOString();
  const user: OnboardingUser = {
    id,
    tenantId,
    email: input.email,
    role: input.role,
    regionId: input.regionId,
    teamId: input.teamId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  store.set(key(tenantId, id), user);
  return user;
}

export function getUser(tenantId: string, userId: string): OnboardingUser | undefined {
  return store.get(key(tenantId, userId));
}

export function listUsers(tenantId: string, filters?: { role?: Role; regionId?: string; teamId?: string }): OnboardingUser[] {
  const out: OnboardingUser[] = [];
  const prefix = `${tenantId}:`;
  for (const [k, u] of store) {
    if (!k.startsWith(prefix)) continue;
    if (filters?.role && u.role !== filters.role) continue;
    if (filters?.regionId && u.regionId !== filters.regionId) continue;
    if (filters?.teamId && u.teamId !== filters.teamId) continue;
    out.push(u);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateUserStatus(tenantId: string, userId: string, status: 'pending' | 'active' | 'suspended'): OnboardingUser | undefined {
  const u = store.get(key(tenantId, userId));
  if (!u) return undefined;
  u.status = status;
  u.updatedAt = new Date().toISOString();
  return u;
}

export function getOnboardingStats(tenantId: string): OnboardingUser[] {
  return listUsers(tenantId);
}
