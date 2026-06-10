import type { UserRole } from './enums.js';

export const PERMISSIONS = [
  'leads:read:all',
  'leads:read:team',
  'leads:read:own',
  'leads:read:qualification',
  'leads:write',
  'leads:delete',
  'leads:reopen',
  'automations:manage',
  'users:manage',
  'reports:read',
  'ai:configure',
  'ai:use',
  'pipeline:manage',
  'integrations:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: [
    'leads:read:all',
    'leads:read:team',
    'leads:read:own',
    'leads:read:qualification',
    'leads:write',
    'leads:delete',
    'leads:reopen',
    'automations:manage',
    'users:manage',
    'reports:read',
    'ai:configure',
    'ai:use',
    'pipeline:manage',
    'integrations:manage',
  ],
  manager: [
    'leads:read:all',
    'leads:read:team',
    'leads:read:own',
    'leads:read:qualification',
    'leads:write',
    'automations:manage',
    'reports:read',
    'ai:use',
    'pipeline:manage',
    'integrations:manage',
  ],
  closer: ['leads:read:own', 'leads:write', 'ai:use'],
  sdr: ['leads:read:own', 'leads:read:qualification', 'leads:write', 'ai:use'],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Visibility scope a role has over leads, used to build the tenant query filter.
 * - all: every lead in the tenant
 * - own: only leads the user owns (closer/sdr)
 */
export function leadVisibilityScope(role: UserRole): 'all' | 'own' {
  return role === 'admin' || role === 'manager' ? 'all' : 'own';
}
