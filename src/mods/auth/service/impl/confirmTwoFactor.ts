import { signAccessToken } from '../../../../shared/auth/jwt.js';
import { AppError, ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { newRecoveryCodes } from '../../../../shared/otp/oneTimeCodes.js';
import { openSecret } from '../../../../shared/otp/secretBox.js';
import { verifyTotp } from '../../../../shared/otp/totp.js';
import { UsersImpl } from '../../../users/index.js';
import type { TwoFactorEnabledResult } from '../../db/_auth.types.js';
import { hashRecoveryCodes, invalidTwoFactorCode, isTwoFactorEnabled } from './twoFactorPolicy.js';

/**
 * Finishes turning 2FA on with the first code from the app. Returns 10 recovery codes (shown
 * once, only their hashes are kept) and an access token, so a sign-in that was waiting on
 * setup continues straight into the app.
 */
export const confirmTwoFactor = async (
    userId: string,
    code: string,
): Promise<TwoFactorEnabledResult> => {
    const user = await UsersImpl.findByIdWithTwoFactor(userId);
    if (!user) throw new NotFoundError('User not found');
    if (isTwoFactorEnabled(user)) {
        throw new ConflictError('Two-factor sign-in is already on', 'TWO_FACTOR_ALREADY_ENABLED');
    }
    const pending = user.twoFactor?.pendingSecret;
    if (!pending) throw new AppError(400, 'TWO_FACTOR_NOT_SET_UP', 'Start the setup first');

    const step = await verifyTotp(openSecret(pending), code);
    if (step == null) throw invalidTwoFactorCode();

    const recoveryCodes = newRecoveryCodes();
    const updated = await UsersImpl.enableTwoFactor(
        userId,
        pending,
        step,
        hashRecoveryCodes(recoveryCodes),
    );
    if (!updated)
        throw new ConflictError(
            'The setup changed meanwhile. Start again.',
            'TWO_FACTOR_SETUP_CHANGED',
        );
    return { recoveryCodes, user: updated, token: signAccessToken(updated) };
};
