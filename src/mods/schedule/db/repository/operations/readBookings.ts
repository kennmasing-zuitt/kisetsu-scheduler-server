import type { Booking, BookingRange } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

/** Every booking overlapping [from, to), earliest first. */
export const readBookings = async ({
    from,
    to,
    therapistId,
    roomId,
}: BookingRange): Promise<Booking[]> =>
    BookingModel.find({
        start: { $lt: to },
        end: { $gt: from },
        ...(therapistId ? { therapistId } : {}),
        ...(roomId ? { roomId } : {}),
    })
        .sort({ start: 1, _id: 1 })
        .lean<Booking[]>();
