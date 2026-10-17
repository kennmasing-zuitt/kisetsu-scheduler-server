import type { Permission } from '../../../../roles/index.js';
import type { UserDocument } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

/** Sets a user's role key and extra permissions. No rules here: see UsersImpl.updateUserAccess. */
export const setAccess = async (
    id: string,
    role: string,
    extraPerms: Permission[],
): Promise<UserDocument | null> =>
    UserModel.findByIdAndUpdate(
        id,
        { $set: { role, extraPerms } },
        { returnDocument: 'after', runValidators: true },
    );
