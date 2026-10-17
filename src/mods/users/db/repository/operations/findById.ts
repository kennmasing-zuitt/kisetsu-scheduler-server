import type { UserDocument } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

export const findById = async (id: string): Promise<UserDocument | null> => UserModel.findById(id);
