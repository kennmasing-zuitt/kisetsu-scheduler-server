import bcrypt from 'bcryptjs';
import { env } from '../../../../core/config/env.js';
import { signAccessToken, signPurposeToken, TokenPurpose } from '../../../../shared/auth/jwt.js';
import { UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import { RolesImpl } from '../../../roles/index.js';
import type { LoginInput } from '../../../users/db/zod/auth.zod.js';
import { UsersImpl } from '../../../users/index.js';
import type { LoginResult } from '../../db/_auth.types.js';
import { isTwoFactorEnabled, requiresTwoFactor } from './twoFactorPolicy.js';

const invalidCredentials = () =>
    new UnauthenticatedError('Invalid email or password', 'INVALID_CREDENTIALS');

// Compared against when the email is unknown, so both failure paths take about the same time
// and response timing doesn't reveal which emails are registered.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () =>
    (dummyHash ??= bcrypt.hash('timing-equaliser-not-a-real-password', env.BCRYPT_SALT_ROUNDS));

/**
 * Step 1 of signing in. With the right password:
 *  - 2FA on:                        { twoFactorRequired, challengeToken } -> loginTwoFactor
 *  - 2FA off but the role needs it: { twoFactorSetupRequired, challengeToken } -> setupTwoFactor
 *  - otherwise:                     { token, user }
 */
export const login = async ({ email, password }: LoginInput): Promise<LoginResult> => {
    const user = await UsersImpl.findByEmailWithPassword(email);

    if (!user) {
        await bcrypt.compare(password, await getDummyHash());
        throw invalidCredentials();
    }
    if (!(await bcrypt.compare(password, user.password))) throw invalidCredentials();

    const subject = { sub: user.id, ver: user.tokenVersion ?? 0 };
    if (isTwoFactorEnabled(user)) {
        const { token: challengeToken } = signPurposeToken(
            TokenPurpose.twoFactorChallenge,
            subject,
        );
        return { twoFactorRequired: true, twoFactorSetupRequired: false, challengeToken };
    }
    if (requiresTwoFactor(await RolesImpl.resolveAuthUser(user))) {
        const { token: challengeToken } = signPurposeToken(TokenPurpose.twoFactorSetup, subject);
        return { twoFactorRequired: false, twoFactorSetupRequired: true, challengeToken };
    }
    return {
        twoFactorRequired: false,
        twoFactorSetupRequired: false,
        user,
        token: signAccessToken(user),
    };
};
