import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { resolvePermissions } from '../../../../shared/auth/permissions.js';
import { RoleKind, type Permission } from '../../db/_roles.enum.js';
import * as RolesOperations from '../../db/repository/index.js';

interface UserAccess {
    id: string;
    role?: string | null;
    extraPerms?: readonly Permission[] | null;
}

/**
 * Turns a user document into the request's AuthUser by loading their role.
 * A user whose role no longer exists is treated as a user-kind account with only extraPerms.
 */
export const resolveAuthUser = async (user: UserAccess): Promise<AuthUser> => {
    const roleKey = user.role ?? '';
    const role = roleKey ? await RolesOperations.findRoleByKey(roleKey) : null;
    const kind = role?.kind ?? RoleKind.user;
    return {
        id: user.id,
        role: roleKey,
        roleKind: kind,
        perms: resolvePermissions(kind, role?.perms ?? [], user.extraPerms ?? []),
    };
};
