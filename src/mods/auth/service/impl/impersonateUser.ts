import { signImpersonationToken } from '../../../../shared/auth/jwt.js';
import { isAdmin } from '../../../../shared/auth/permissions.js';
import { ForbiddenError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { AuditAction, AuditImpl, type AuditMeta } from '../../../audit/index.js';
import { RolesImpl } from '../../../roles/index.js';
import { UsersImpl, type UserDocument } from '../../../users/index.js';

export interface ImpersonationResult {
    token: string;
    expiresAt: Date;
    user: UserDocument;
    impersonatedBy: string;
}

/**
 * Issues a short-lived token (IMPERSONATION_TOKEN_TTL) that acts as `targetId`, signed with the
 * admin as `act`. Users with an admin-kind role can't be impersonated. The start of every session
 * is audited with the reason; every request made with the token is logged by verifyToken.
 *
 * The session ends when the token expires, or earlier if the admin logs out / loses
 * impersonateUsers, or the user's tokenVersion changes.
 */
export const impersonateUser = async (
    adminId: string,
    targetId: string,
    reason: string,
    meta: AuditMeta,
): Promise<ImpersonationResult> => {
    const [admin, target] = await Promise.all([
        UsersImpl.findById(adminId),
        UsersImpl.findById(targetId),
    ]);
    if (!target) throw new NotFoundError('User not found');
    if (!admin) throw new NotFoundError('Admin not found');
    if (isAdmin(await RolesImpl.resolveAuthUser(target))) {
        throw new ForbiddenError('Admins cannot be impersonated', 'CANNOT_IMPERSONATE_ADMIN');
    }

    const { token, expiresAt } = signImpersonationToken(target, admin);
    await AuditImpl.recordAudit(meta, {
        action: AuditAction.impersonationStarted,
        targetId,
        reason,
        details: { expiresAt: expiresAt.toISOString() },
    });
    return { token, expiresAt, user: target, impersonatedBy: admin.id };
};
