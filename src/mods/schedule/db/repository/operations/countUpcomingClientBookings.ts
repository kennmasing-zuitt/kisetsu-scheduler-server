import { ACTIVE_BOOKING, BookingSource } from '../../_schedule.enum.js';
import { BookingModel } from '../../booking.model.js';

/** Active bookings of a client that haven't started yet (optionally only online ones). */
export const countUpcomingClientBookings = async (
    clientId: string,
    after: Date,
    source?: BookingSource,
): Promise<number> =>
    BookingModel.countDocuments({
        ...ACTIVE_BOOKING,
        clientId,
        start: { $gt: after },
        ...(source ? { source } : {}),
    });
