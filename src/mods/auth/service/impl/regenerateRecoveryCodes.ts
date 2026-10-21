import { UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import { newRecoveryCodes } from '../../../../shared/otp/oneTimeCodes.js';
import { UsersImpl } from '../../../users/index.js';
import { hashRecoveryCodes, verifySecondFactor } from './twoFactorPolicy.js';

/** Replaces every recovery code (the old ones stop working). Needs a current code. */
export const regenerateRecoveryCodes = async (userId: string, code: string): Promise<string[]> => {
    const user = await UsersImpl.findByIdWithTwoFactor(userId);
    if (!user) throw new UnauthenticatedError();
    await verifySecondFactor(user, code);
    const codes = newRecoveryCodes();
    await UsersImpl.setRecoveryCodes(userId, hashRecoveryCodes(codes));
    return codes;
};
