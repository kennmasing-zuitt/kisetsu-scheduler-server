import { NotFoundError } from '../../../../shared/errors/AppError.js';
import type { Booking, Therapist, UpdateTherapistData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { cancelBookingsForUnavailableTherapist } from './therapistConflicts.js';

export interface UpdateTherapistResult {
    therapist: Therapist;
    /** Upcoming bookings cancelled because the therapist is now off that day (clients texted) */
    cancelledBookings: Booking[];
}

/**
 * Updates a therapist. When days off or leave change, their upcoming bookings on days they no
 * longer work are cancelled and the clients get a text asking them to rebook.
 */
export const updateTherapist = async (
    data: UpdateTherapistData,
    actorId: string | null = null,
): Promise<UpdateTherapistResult> => {
    const therapist = await ScheduleOperations.updateTherapist({
        _id: data._id,
        name: data.name,
        offDays: data.offDays,
        leaveDates: data.leaveDates,
    });
    if (!therapist) throw new NotFoundError('Therapist not found');

    const availabilityChanged = data.offDays !== undefined || data.leaveDates !== undefined;
    const cancelledBookings = availabilityChanged
        ? await cancelBookingsForUnavailableTherapist(data._id, actorId)
        : [];
    return { therapist, cancelledBookings };
};
