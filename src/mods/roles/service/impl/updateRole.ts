import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { ForbiddenError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { AuditAction, AuditImpl, type AuditMeta } from '../../../audit/index.js';
import { SUPER_ADMIN_ROLE_KEY } from '../../db/_roles.enum.js';
import type { Role } from '../../db/_roles.types.js';
import * as RolesOperations from '../../db/repository/index.js';
import type { UpdateRoleInput } from '../../db/role.zod.js';
import { assertCanManageRole } from './assertCanManageRole.js';

/**
 * Updates name/description/perms (key and kind are immutable). Permission changes reach every
 * user with the role on their next request. The super-admin role is locked.
 */
export const updateRole = async (
    actor: AuthUser,
    key: string,
    input: UpdateRoleInput,
    meta: AuditMeta,
): Promise<Role> => {
    const role = await RolesOperations.findRoleByKey(key);
    if (!role) throw new NotFoundError('Role not found');
    if (role.key === SUPER_ADMIN_ROLE_KEY) {
        throw new ForbiddenError('The super-admin role cannot be changed', 'SYSTEM_ROLE_LOCKED');
    }
    // Checked against the role's current perms too, so you can't edit a role above your level
    assertCanManageRole(actor, role.kind, [...role.perms, ...(input.perms ?? [])]);

    const updated = await RolesOperations.updateRole(role.key, input);
    if (!updated) throw new NotFoundError('Role not found');

    await AuditImpl.recordAudit(meta, {
        action: AuditAction.roleUpdated,
        details: {
            role: role.key,
            before: { name: role.name, description: role.description, perms: role.perms },
            after: { name: updated.name, description: updated.description, perms: updated.perms },
        },
    });
    return updated;
};
