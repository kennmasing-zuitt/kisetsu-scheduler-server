import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import {
    assertPermsFitKind,
    isSuperAdmin,
    permsNotHeldBy,
} from '../../../../shared/auth/permissions.js';
import { ForbiddenError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { AuditAction, AuditImpl, type AuditMeta } from '../../../audit/index.js';
import { RoleKind, RolesImpl, type Permission } from '../../../roles/index.js';
import type { UserDocument } from '../../db/_users.types.js';
import * as UsersOperations from '../../db/repository/index.js';

export interface UserAccessInput {
    role: string;
    extraPerms: Permission[];
}

/**
 * Assigns a role (and optional per-user extra permissions), enforcing the admin hierarchy:
 *  1. nobody changes their own access
 *  2. only a super admin can change an admin, or give someone an admin-kind role
 *  3. you can only hand out permissions you hold, through the role or the extras
 *  4. admin permissions can't be given as extras to a user-kind role
 * Applies on the user's next request (verifyToken reads access fresh) and is audited.
 */
export const updateUserAccess = async (
    actor: AuthUser,
    targetId: string,
    { role: roleKey, extraPerms }: UserAccessInput,
    meta: AuditMeta,
): Promise<UserDocument> => {
    if (actor.id === targetId) {
        throw new ForbiddenError('You cannot change your own access', 'CANNOT_MODIFY_SELF');
    }

    const [target, role] = await Promise.all([
        UsersOperations.findById(targetId),
        RolesImpl.getRole(roleKey),
    ]);
    if (!target) throw new NotFoundError('User not found');
    if (!role) throw new NotFoundError(`Role "${roleKey}" not found`);
    const before = await RolesImpl.resolveAuthUser(target);

    const touchesAdmin = before.roleKind === RoleKind.admin || role.kind === RoleKind.admin;
    if (touchesAdmin && !isSuperAdmin(actor)) {
        throw new ForbiddenError('Only a super admin can manage admins');
    }

    const extras = [...new Set(extraPerms)];
    const notHeld = permsNotHeldBy(actor, [...role.perms, ...extras]);
    if (notHeld.length > 0) {
        throw new ForbiddenError(
            `You cannot grant permissions you don't have: ${[...new Set(notHeld)].join(', ')}`,
        );
    }
    assertPermsFitKind(role.kind, extras);

    const updated = await UsersOperations.setAccess(targetId, role.key, extras);
    if (!updated) throw new NotFoundError('User not found');

    await AuditImpl.recordAudit(meta, {
        action: AuditAction.userAccessChanged,
        targetId,
        details: {
            before: { role: target.role, extraPerms: target.extraPerms },
            after: { role: role.key, extraPerms: extras },
        },
    });
    return updated;
};
