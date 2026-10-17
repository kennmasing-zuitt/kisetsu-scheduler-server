import type { Role } from '../../db/_roles.types.js';
import * as RolesOperations from '../../db/repository/index.js';

export const getRole = async (key: string): Promise<Role | null> =>
    RolesOperations.findRoleByKey(key);
