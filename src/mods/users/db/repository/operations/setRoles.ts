import type { RoleKey } from '../../_users.enum.js';
import type { UserDocument } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

export const setRoles = async (id: string, roles: RoleKey[]): Promise<UserDocument | null> =>
    UserModel.findByIdAndUpdate(
        id,
        { roles: roles.map((key) => ({ key })) },
        { returnDocument: 'after', runValidators: true },
    );
