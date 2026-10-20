import { NotFoundError } from '../../../../shared/errors/AppError.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/** Cancels a booking (removes it, freeing the therapist and room). */
export const deleteBooking = async (_id: string): Promise<boolean> => {
    const deleted = await ScheduleOperations.deleteBooking(_id);
    if (!deleted) throw new NotFoundError('Booking not found');
    return true;
};
