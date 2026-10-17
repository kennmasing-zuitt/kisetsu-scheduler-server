import { NotFoundError } from '../../../../shared/errors/AppError.js';
import * as UsersOperations from '../../db/repository/index.js';

export const incrementTokenVersion = async (id: string): Promise<void> => {
    const found = await UsersOperations.incrementTokenVersion(id);
    if (!found) throw new NotFoundError('User not found');
};
