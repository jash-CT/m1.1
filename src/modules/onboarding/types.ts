export type Role = 'admin' | 'team_lead' | 'regional' | 'member';

export interface OnboardingUser {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  regionId?: string;
  teamId?: string;
  status: 'pending' | 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  role: Role;
  regionId?: string;
  teamId?: string;
}

export interface OnboardingStats {
  total: number;
  byRole: Record<Role, number>;
  byRegion: Record<string, number>;
  pending: number;
  active: number;
}
