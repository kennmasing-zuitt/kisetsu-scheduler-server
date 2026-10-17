import bcrypt from 'bcryptjs';
import { mongo } from 'mongoose';
import { env } from '../../../../core/config/env.js';
import { signAccessToken } from '../../../../shared/auth/jwt.js';
import { ConflictError } from '../../../../shared/errors/AppError.js';
import type { RegisterInput } from '../../../users/db/zod/auth.zod.js';
import { UsersImpl } from '../../../users/index.js';
import type { AuthResult } from '../../db/_auth.types.js';

const emailTaken = () => new ConflictError('That email is already registered.', 'EMAIL_TAKEN');

/**
 * Expects input already validated by RegisterInput (email trimmed + lowercased).
 * The default `user` role comes from the model.
 */
export const register = async ({ name, email, password }: RegisterInput): Promise<AuthResult> => {
    const alreadyExists = await UsersImpl.findByEmail(email);
    if (alreadyExists) throw emailTaken();

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    try {
        const user = await UsersImpl.create({ name, email, password: passwordHash });
        return { user, token: signAccessToken(user) };
    } catch (err) {
        // Two sign-ups racing past the check above: the unique index rejects the second one
        if (err instanceof mongo.MongoServerError && err.code === 11000) throw emailTaken();
        throw err;
    }
};
