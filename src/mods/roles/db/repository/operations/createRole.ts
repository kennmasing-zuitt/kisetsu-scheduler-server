import type { CreateRoleData, Role } from '../../_roles.types.js';
import { RoleModel } from '../../role.model.js';

export const createRole = async (data: CreateRoleData): Promise<Role> =>
    (await RoleModel.create(data)).toObject() as Role;
