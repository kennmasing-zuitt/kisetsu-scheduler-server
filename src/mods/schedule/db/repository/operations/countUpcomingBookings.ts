import type { UpcomingQuery } from '../../_schedule.types.js';
import { ACTIVE_BOOKING } from '../../_schedule.enum.js';
import { BookingModel } from '../../booking.model.js';

/** How many bookings of a therapist and/or room haven't ended yet at `after`. */
export const countUpcomingBookings = async ({
    therapistId,
    roomId,
    after,
}: UpcomingQuery): Promise<number> =>
    BookingModel.countDocuments({
        ...ACTIVE_BOOKING,
        ...(therapistId ? { therapistId } : {}),
        ...(roomId ? { roomId } : {}),
        end: { $gt: after },
    });
