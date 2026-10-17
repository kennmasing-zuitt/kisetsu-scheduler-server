import bcrypt from 'bcryptjs';
import { mongo } from 'mongoose';
import { env } from '../../../../core/config/env.js';
import { ConflictError } from '../../../../shared/errors/AppError.js';
import { UsersImpl, type UserDocument } from '../../../users/index.js';

const emailTaken = () => new ConflictError('That email is already registered.', 'EMAIL_TAKEN');

export const register = async (
    name: string,
    email: string,
    password: string,
): Promise<UserDocument> => {
    const alreadyExists = await UsersImpl.findByEmail(email);
    if (alreadyExists) throw emailTaken();

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    try {
        return await UsersImpl.create({ name, email, password: passwordHash });
    } catch (err) {
        // Two sign-ups racing past the check above: the unique index rejects the second one
        if (err instanceof mongo.MongoServerError && err.code === 11000) throw emailTaken();
        throw err;
    }
};
