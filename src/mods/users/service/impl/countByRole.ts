import * as UsersOperations from '../../db/repository/index.js';

export const countByRole = async (roleKey: string): Promise<number> =>
    UsersOperations.countByRole(roleKey);
