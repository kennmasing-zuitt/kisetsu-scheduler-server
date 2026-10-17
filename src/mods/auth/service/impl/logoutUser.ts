import { AuditAction, AuditImpl, type AuditMeta } from '../../../audit/index.js';
import { UsersImpl } from '../../../users/index.js';

/**
 * Admin action: signs one user out of every device by incrementing their tokenVersion.
 * Throws NOT_FOUND (404) if the user doesn't exist. Audited.
 */
export const logoutUser = async (userId: string, meta: AuditMeta): Promise<void> => {
    await UsersImpl.incrementTokenVersion(userId);
    await AuditImpl.recordAudit(meta, { action: AuditAction.userLoggedOut, targetId: userId });
};
