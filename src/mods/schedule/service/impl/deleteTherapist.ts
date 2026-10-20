import { NotFoundError } from '../../../../shared/errors/AppError.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const deleteTherapist = async (_id: string): Promise<boolean> => {
    const deleted = await ScheduleOperations.deleteTherapist(_id);
    if (!deleted) throw new NotFoundError('Therapist not found');
    return true;
};
