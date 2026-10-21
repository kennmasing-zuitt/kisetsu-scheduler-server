import { ACTIVE_BOOKING } from '../../_schedule.enum.js';
import type { Booking } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

/** A therapist's active bookings starting after `after`, earliest first. */
export const findUpcomingTherapistBookings = async (
    therapistId: string,
    after: Date,
): Promise<Booking[]> =>
    BookingModel.find({ ...ACTIVE_BOOKING, therapistId, start: { $gt: after } })
        .sort({ start: 1 })
        .lean<Booking[]>();
