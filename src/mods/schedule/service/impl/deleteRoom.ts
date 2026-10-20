import { NotFoundError } from '../../../../shared/errors/AppError.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const deleteRoom = async (_id: string): Promise<boolean> => {
    const deleted = await ScheduleOperations.deleteRoom(_id);
    if (!deleted) throw new NotFoundError('Room not found');
    return true;
};
