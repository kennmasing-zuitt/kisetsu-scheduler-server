import type { Booking, BookingRange } from '../../_schedule.types.js';
import { ACTIVE_BOOKING } from '../../_schedule.enum.js';
import { BookingModel } from '../../booking.model.js';

/** Every active (not cancelled) booking overlapping [from, to), earliest first. */
export const readBookings = async ({
    from,
    to,
    therapistId,
    roomId,
}: BookingRange): Promise<Booking[]> =>
    BookingModel.find({
        ...ACTIVE_BOOKING,
        start: { $lt: to },
        end: { $gt: from },
        ...(therapistId ? { therapistId } : {}),
        ...(roomId ? { roomId } : {}),
    })
        .sort({ start: 1, _id: 1 })
        .lean<Booking[]>();
