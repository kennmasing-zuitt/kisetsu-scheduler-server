import type { Role } from '../../_roles.types.js';
import { RoleModel } from '../../role.model.js';

export const findRolesByKeys = async (keys: string[]): Promise<Role[]> =>
    RoleModel.find({ key: { $in: keys } }).lean<Role[]>();
