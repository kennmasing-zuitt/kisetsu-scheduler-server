import type { Role, UpdateRoleData } from '../../_roles.types.js';
import { RoleModel } from '../../role.model.js';

export const updateRole = async (key: string, data: UpdateRoleData): Promise<Role | null> => {
    const $set = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return RoleModel.findOneAndUpdate(
        { key },
        { $set },
        { returnDocument: 'after', runValidators: true },
    ).lean<Role>();
};
