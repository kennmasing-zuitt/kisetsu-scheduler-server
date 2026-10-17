import bcrypt from 'bcryptjs';
import { env } from '../../../../core/config/env.js';
import { signAccessToken } from '../../../../shared/auth/jwt.js';
import { UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import type { LoginInput } from '../../../users/db/zod/auth.zod.js';
import { UsersImpl } from '../../../users/index.js';
import type { AuthResult } from '../../db/_auth.types.js';

const invalidCredentials = () =>
    new UnauthenticatedError('Invalid email or password', 'INVALID_CREDENTIALS');

// Compared against when the email is unknown, so both failure paths take about the same time
// and response timing doesn't reveal which emails are registered.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () =>
    (dummyHash ??= bcrypt.hash('timing-equaliser-not-a-real-password', env.BCRYPT_SALT_ROUNDS));

export const login = async ({ email, password }: LoginInput): Promise<AuthResult> => {
    const user = await UsersImpl.findByEmailWithPassword(email);

    if (!user) {
        await bcrypt.compare(password, await getDummyHash());
        throw invalidCredentials();
    }
    if (!(await bcrypt.compare(password, user.password))) throw invalidCredentials();

    return { user, token: signAccessToken(user) };
};
