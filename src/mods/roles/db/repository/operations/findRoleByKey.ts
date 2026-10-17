import type { Role } from '../../_roles.types.js';
import { RoleModel } from '../../role.model.js';

export const findRoleByKey = async (key: string): Promise<Role | null> =>
    RoleModel.findOne({ key: key.trim().toLowerCase() }).lean<Role>();
