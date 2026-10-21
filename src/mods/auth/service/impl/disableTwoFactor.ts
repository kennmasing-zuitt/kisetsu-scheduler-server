import bcrypt from 'bcryptjs';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { ForbiddenError, UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import { UsersImpl } from '../../../users/index.js';
import { requiresTwoFactor, verifySecondFactor } from './twoFactorPolicy.js';

/** Turns 2FA off with the password AND a code. Not allowed for roles that require 2FA. */
export const disableTwoFactor = async (
    authUser: AuthUser,
    password: string,
    code: string,
): Promise<void> => {
    if (requiresTwoFactor(authUser)) {
        throw new ForbiddenError('Your role requires two-factor sign-in', 'TWO_FACTOR_REQUIRED');
    }
    const [withPassword, withSecrets] = await Promise.all([
        UsersImpl.findByIdWithPassword(authUser.id),
        UsersImpl.findByIdWithTwoFactor(authUser.id),
    ]);
    if (!withPassword || !withSecrets) throw new UnauthenticatedError();
    if (!(await bcrypt.compare(password, withPassword.password))) {
        throw new ForbiddenError('Current password is incorrect', 'WRONG_PASSWORD');
    }
    await verifySecondFactor(withSecrets, code);
    await UsersImpl.clearTwoFactor(authUser.id, false);
};
