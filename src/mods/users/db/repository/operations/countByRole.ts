import { UserModel } from '../../user.model.js';

export const countByRole = async (roleKey: string): Promise<number> =>
    UserModel.countDocuments({ role: roleKey });
