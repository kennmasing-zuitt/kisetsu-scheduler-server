import type { UserDocument } from '../../db/_users.types.js';
import * as UsersOperations from '../../db/repository/index.js';

export const findByEmailWithPassword = async (key: string): Promise<UserDocument | null> =>
    UsersOperations.findByEmailWithPassword(key);
