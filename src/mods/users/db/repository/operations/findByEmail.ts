import type { UserDocument } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

export const findByEmail = async (email: string): Promise<UserDocument | null> =>
    UserModel.findOne({ email: email.trim().toLowerCase() });
