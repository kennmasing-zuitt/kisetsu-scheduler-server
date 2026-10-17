import type { UserDocument } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

/** Loads the password hash for a known user (change password). Never return it to a client. */
export const findByIdWithPassword = async (id: string): Promise<UserDocument | null> =>
    UserModel.findById(id, '+password');
