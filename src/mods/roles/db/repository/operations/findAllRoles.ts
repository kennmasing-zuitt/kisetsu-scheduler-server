import type { Role } from '../../_roles.types.js';
import { RoleModel } from '../../role.model.js';

/** System roles first, then alphabetical. */
export const findAllRoles = async (): Promise<Role[]> =>
    RoleModel.find().sort({ isSystem: -1, key: 1 }).lean<Role[]>();
