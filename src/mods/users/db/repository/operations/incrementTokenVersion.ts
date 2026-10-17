import { UserModel } from '../../user.model.js';

/** Revokes every token issued so far for this user. */
export const incrementTokenVersion = async (id: string): Promise<boolean> => {
    const result = await UserModel.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
    return result.matchedCount > 0;
};
