import { NotFoundError } from '../../../../shared/errors/AppError.js';
import { CancelReason } from '../../db/_schedule.enum.js';
import type { Booking } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { cancelBooking } from './cancelBooking.js';
import { isTherapistOff } from './therapistAvailability.js';

interface Availability {
    offDays: readonly number[];
    leaveDates: readonly string[];
}

/** Upcoming bookings of this therapist that fall on a day they'd be off with `availability`. */
export async function therapistConflicts(
    therapistId: string,
    availability?: Partial<Availability>,
): Promise<Booking[]> {
    const therapist = await ScheduleOperations.findTherapistById(therapistId);
    if (!therapist) throw new NotFoundError('Therapist not found');
    const effective: Availability = {
        offDays: availability?.offDays ?? therapist.offDays,
        leaveDates: availability?.leaveDates ?? therapist.leaveDates,
    };
    const upcoming = await ScheduleOperations.findUpcomingTherapistBookings(
        therapistId,
        new Date(),
    );
    return upcoming.filter((b) => isTherapistOff(effective, b.start));
}

/**
 * After a therapist's days off or leave change: cancels their upcoming bookings on days they no
 * longer work and texts each client to rebook. Returns the cancelled bookings.
 */
export async function cancelBookingsForUnavailableTherapist(
    therapistId: string,
    cancelledBy: string | null,
): Promise<Booking[]> {
    const conflicts = await therapistConflicts(therapistId);
    const cancelled: Booking[] = [];
    for (const booking of conflicts) {
        try {
            cancelled.push(
                await cancelBooking(String(booking._id), {
                    reason: CancelReason.therapistUnavailable,
                    cancelledBy,
                    notifyClient: true,
                }),
            );
        } catch {
            // Already cancelled by someone else meanwhile: nothing to do
        }
    }
    return cancelled;
}
