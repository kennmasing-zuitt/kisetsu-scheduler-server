import { NotFoundError } from '../../../../shared/errors/AppError.js';
import type { UserDocument } from '../../db/_users.types.js';
import * as UsersOperations from '../../db/repository/index.js';

/** `passwordHash` must already be hashed (see AuthImpl.changePassword). */
export const updatePassword = async (id: string, passwordHash: string): Promise<UserDocument> => {
    const user = await UsersOperations.updatePassword(id, passwordHash);
    if (!user) throw new NotFoundError('User not found');
    return user;
};
