import { signAccessToken, TokenPurpose, verifyPurposeToken } from '../../../../shared/auth/jwt.js';
import { UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import { UsersImpl, type UserDocument } from '../../../users/index.js';
import type { AuthResult } from '../../db/_auth.types.js';
import { verifySecondFactor } from './twoFactorPolicy.js';

const CHALLENGE_EXPIRED = 'TWO_FACTOR_CHALLENGE_EXPIRED';

/**
 * Loads the user a purpose token was issued for, checking it wasn't revoked since (logout,
 * password change). Shared by the 2FA steps.
 */
export async function userForPurposeToken(
    purpose: TokenPurpose,
    token: string,
): Promise<UserDocument> {
    const claims = verifyPurposeToken(purpose, token, CHALLENGE_EXPIRED);
    const user = await UsersImpl.findByIdWithTwoFactor(claims.sub);
    if (!user || (user.tokenVersion ?? 0) !== claims.ver) {
        throw new UnauthenticatedError(
            'This sign-in has ended. Please start again.',
            CHALLENGE_EXPIRED,
        );
    }
    return user;
}

/** Step 2 of signing in: the authenticator code (or a recovery code) for the challenge. */
export const loginTwoFactor = async (challengeToken: string, code: string): Promise<AuthResult> => {
    const user = await userForPurposeToken(TokenPurpose.twoFactorChallenge, challengeToken);
    await verifySecondFactor(user, code);
    return { user, token: signAccessToken(user) };
};
