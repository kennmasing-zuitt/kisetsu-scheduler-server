import type { UserDocument } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

/**
 * The ONLY lookup by email that loads the password hash (`select: false` on the field).
 * Use it for credential checks, never to return data to a client.
 */
export const findByEmailWithPassword = async (email: string): Promise<UserDocument | null> =>
    UserModel.findOne({ email: email.trim().toLowerCase() }, '+password');
