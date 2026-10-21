import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { isSuperAdmin } from '../../../../shared/auth/permissions.js';
import { ForbiddenError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { AuditAction, AuditImpl, type AuditMeta } from '../../../audit/index.js';
import { RoleKind, RolesImpl } from '../../../roles/index.js';
import { UsersImpl } from '../../../users/index.js';

/**
 * Admin action for a lost phone: turns the user's 2FA off and signs them out everywhere. On their
 * next sign-in they set it up again (required roles are sent straight to setup). Only a super
 * admin can reset another admin; nobody resets their own. Audited.
 */
export const resetUserTwoFactor = async (
    actor: AuthUser,
    targetId: string,
    meta: AuditMeta,
): Promise<void> => {
    if (actor.id === targetId) {
        throw new ForbiddenError('Use your own security settings instead', 'CANNOT_MODIFY_SELF');
    }
    const target = await UsersImpl.findById(targetId);
    if (!target) throw new NotFoundError('User not found');
    const access = await RolesImpl.resolveAuthUser(target);
    if (access.roleKind === RoleKind.admin && !isSuperAdmin(actor)) {
        throw new ForbiddenError('Only a super admin can manage admins');
    }
    await UsersImpl.clearTwoFactor(targetId, true);
    await AuditImpl.recordAudit(meta, { action: AuditAction.twoFactorReset, targetId });
};
