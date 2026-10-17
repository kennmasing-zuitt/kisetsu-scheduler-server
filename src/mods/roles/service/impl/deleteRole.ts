import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from '../../../../shared/errors/AppError.js';
import { AuditAction, AuditImpl, type AuditMeta } from '../../../audit/index.js';
import * as RolesOperations from '../../db/repository/index.js';
import { assertCanManageRole } from './assertCanManageRole.js';

/** Deletes a custom role. System roles and roles still assigned to users can't be deleted. */
export const deleteRole = async (actor: AuthUser, key: string, meta: AuditMeta): Promise<true> => {
    const role = await RolesOperations.findRoleByKey(key);
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) {
        throw new ForbiddenError('System roles cannot be deleted', 'SYSTEM_ROLE_LOCKED');
    }
    assertCanManageRole(actor, role.kind, role.perms);

    // Imported lazily: the users module depends on roles, so a static import would be circular
    const { UsersImpl } = await import('../../../users/index.js');
    const assigned = await UsersImpl.countByRole(role.key);
    if (assigned > 0) {
        throw new ConflictError(
            `Role "${role.key}" is assigned to ${assigned} user(s); reassign them first`,
            'ROLE_IN_USE',
            { assigned },
        );
    }

    await RolesOperations.deleteRole(role.key);
    await AuditImpl.recordAudit(meta, {
        action: AuditAction.roleDeleted,
        details: { role: role.key, kind: role.kind, perms: role.perms },
    });
    return true;
};
