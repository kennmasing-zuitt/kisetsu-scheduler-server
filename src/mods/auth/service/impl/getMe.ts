import { UnauthenticatedError } from '../../../../shared/errors/AppError.js';
import { UsersImpl, type UserDocument } from '../../../users/index.js';

/** The current user, looked up by req.user.id (set by verifyToken). */
export const getMe = async (userId: string): Promise<UserDocument> => {
    const user = await UsersImpl.findById(userId);
    if (!user) throw new UnauthenticatedError();
    return user;
};
