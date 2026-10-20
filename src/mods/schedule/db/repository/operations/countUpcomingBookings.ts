import type { UpcomingQuery } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

/** How many bookings of a therapist and/or room haven't ended yet at `after`. */
export const countUpcomingBookings = async ({
    therapistId,
    roomId,
    after,
}: UpcomingQuery): Promise<number> =>
    BookingModel.countDocuments({
        ...(therapistId ? { therapistId } : {}),
        ...(roomId ? { roomId } : {}),
        end: { $gt: after },
    });
