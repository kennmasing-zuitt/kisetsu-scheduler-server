import type { RoleKey } from '../../db/_users.enum.js';
import type { UserDocument } from '../../db/_users.types.js';
import * as UsersOperations from '../../db/repository/index.js';

export const setRoles = async (id: string, roles: RoleKey[]): Promise<UserDocument | null> =>
    UsersOperations.setRoles(id, roles);
