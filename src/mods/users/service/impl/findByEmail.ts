import type { UserDocument } from '../../db/_users.types.js';
import * as UsersOperations from '../../db/repository/index.js';

export const findByEmail = async (email: string): Promise<UserDocument | null> =>
    UsersOperations.findByEmail(email);
