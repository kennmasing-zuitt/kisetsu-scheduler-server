import {
    ADMIN_PERMISSIONS,
    PERMISSION_VALUES,
    Permission,
    RoleKind,
} from '../../mods/roles/db/_roles.enum.js';
import { ValidationError } from '../errors/AppError.js';
import type { AuthUser } from './auth.types.js';

type WithEffectivePerms = Pick<AuthUser, 'roleKind' | 'perms'>;

/**
 * The single place permissions are computed:
 *   effective = role.perms + user.extraPerms
 *   - admin permissions are dropped unless the role is admin-kind
 *   - superAdmin (on an admin-kind role) expands to every permission
 */
export function resolvePermissions(
    kind: RoleKind,
    rolePerms: readonly Permission[],
    extraPerms: readonly Permission[] = [],
): Permission[] {
    const granted = new Set([...rolePerms, ...extraPerms]);
    if (kind !== RoleKind.admin) ADMIN_PERMISSIONS.forEach((p) => granted.delete(p));
    if (granted.has(Permission.superAdmin)) return [...PERMISSION_VALUES];
    return PERMISSION_VALUES.filter((p) => granted.has(p)); // stable, enum order
}

export const hasPermission = (user: WithEffectivePerms, perm: Permission) =>
    user.perms.includes(perm);

export const isAdmin = (user: Pick<AuthUser, 'roleKind'>) => user.roleKind === RoleKind.admin;

export const isSuperAdmin = (user: WithEffectivePerms) =>
    isAdmin(user) && user.perms.includes(Permission.superAdmin);

/** Permissions in `perms` that `actor` doesn't hold (the "can only grant what you have" rule). */
export const permsNotHeldBy = (actor: WithEffectivePerms, perms: readonly Permission[]) =>
    perms.filter((p) => !hasPermission(actor, p));

/** Rejects admin permissions on a user-kind role / user, so stored data can't drift. */
export function assertPermsFitKind(kind: RoleKind, perms: readonly Permission[]) {
    if (kind === RoleKind.admin) return;
    const adminOnly = perms.filter((p) => ADMIN_PERMISSIONS.includes(p));
    if (adminOnly.length > 0) {
        throw new ValidationError(`Only admin roles can hold: ${adminOnly.join(', ')}`, {
            perms: adminOnly,
        });
    }
}
