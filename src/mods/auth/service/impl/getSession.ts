import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import type { Permission } from '../../../roles/index.js';
import { UsersImpl, type UserDocument } from '../../../users/index.js';
import { getMe } from './getMe.js';
import { requiresTwoFactor } from './twoFactorPolicy.js';

export interface SessionInfo {
    user: UserDocument;
    effectivePerms: Permission[];
    impersonatedBy: UserDocument | null;
    twoFactorRequired: boolean;
}

/** The current user, what they can actually do, and who is impersonating them (if anyone). */
export const getSession = async (authUser: AuthUser): Promise<SessionInfo> => {
    const [user, admin] = await Promise.all([
        getMe(authUser.id),
        authUser.impersonatedBy ? UsersImpl.findById(authUser.impersonatedBy) : null,
    ]);
    return {
        user,
        effectivePerms: authUser.perms,
        impersonatedBy: admin,
        twoFactorRequired: requiresTwoFactor(authUser),
    };
};
