import type { UserDocument } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

/** Stores a new password HASH and revokes all existing tokens, in one atomic update. */
export const updatePassword = async (
    id: string,
    passwordHash: string,
): Promise<UserDocument | null> =>
    UserModel.findByIdAndUpdate(
        id,
        { $set: { password: passwordHash }, $inc: { tokenVersion: 1 } },
        { returnDocument: 'after' },
    );
