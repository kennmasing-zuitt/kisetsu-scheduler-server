import type { CreateUserData, UserDocument } from '../../db/_users.types.js';
import * as UsersOperations from '../../db/repository/index.js';

export const create = async (data: CreateUserData): Promise<UserDocument> =>
    UsersOperations.create({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
    });
