import { ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/**
 * Removes a therapist from the roster. Refused while they still have bookings that haven't
 * ended (THERAPIST_HAS_BOOKINGS): reassign or cancel those first. Past bookings are kept.
 */
export const deleteTherapist = async (_id: string): Promise<boolean> => {
    const therapist = await ScheduleOperations.findTherapistById(_id);
    if (!therapist) throw new NotFoundError('Therapist not found');

    const upcoming = await ScheduleOperations.countUpcomingBookings({
        therapistId: _id,
        after: new Date(),
    });
    if (upcoming > 0) {
        throw new ConflictError(
            `${therapist.name} still has ${upcoming} upcoming booking${upcoming === 1 ? '' : 's'}. ` +
                'Reassign or cancel them first.',
            'THERAPIST_HAS_BOOKINGS',
            { upcoming },
        );
    }

    const deleted = await ScheduleOperations.deleteTherapist(_id);
    if (!deleted) throw new NotFoundError('Therapist not found');
    return true;
};
