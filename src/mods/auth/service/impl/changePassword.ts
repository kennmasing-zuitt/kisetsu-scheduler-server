import bcrypt from 'bcryptjs';
import { env } from '../../../../core/config/env.js';
import { signAccessToken } from '../../../../shared/auth/jwt.js';
import { ForbiddenError, UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import type { ChangePasswordInput } from '../../../users/db/zod/auth.zod.js';
import { UsersImpl } from '../../../users/index.js';
import type { AuthResult } from '../../db/_auth.types.js';

/**
 * Verifies the current password (403 WRONG_PASSWORD), stores the new hash and increments
 * tokenVersion in one update (signing out every other device), then returns a fresh token
 * for the device that made the change.
 */
export const changePassword = async (
    userId: string,
    { currentPassword, newPassword }: ChangePasswordInput,
): Promise<AuthResult> => {
    const user = await UsersImpl.findByIdWithPassword(userId);
    if (!user) throw new UnauthenticatedError();

    if (!(await bcrypt.compare(currentPassword, user.password))) {
        throw new ForbiddenError('Current password is incorrect', 'WRONG_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
    const updated = await UsersImpl.updatePassword(userId, passwordHash);
    return { user: updated, token: signAccessToken(updated) };
};
