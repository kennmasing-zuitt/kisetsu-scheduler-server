import { ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { sealSecret } from '../../../../shared/otp/secretBox.js';
import { newTotpSecret, totpEnrollment, type TotpEnrollment } from '../../../../shared/otp/totp.js';
import { UsersImpl } from '../../../users/index.js';
import { isTwoFactorEnabled } from './twoFactorPolicy.js';

/**
 * Starts turning 2FA on: a new secret, shown as a QR code to scan. Nothing changes until
 * confirmTwoFactor receives a first code from the app. Calling it again starts over.
 */
export const setupTwoFactor = async (userId: string): Promise<TotpEnrollment> => {
    const user = await UsersImpl.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    if (isTwoFactorEnabled(user)) {
        throw new ConflictError('Two-factor sign-in is already on', 'TWO_FACTOR_ALREADY_ENABLED');
    }
    const secret = newTotpSecret();
    await UsersImpl.setPendingTwoFactor(userId, sealSecret(secret));
    return totpEnrollment(secret, user.email);
};
