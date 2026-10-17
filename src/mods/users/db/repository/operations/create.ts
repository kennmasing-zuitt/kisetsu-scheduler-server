import type { CreateUserData, UserDocument } from '../../_users.types.js';
import { UserModel } from '../../user.model.js';

export const create = async (data: CreateUserData): Promise<UserDocument> => UserModel.create(data);
