import type { Booking, OverlapQuery } from '../../_schedule.types.js';
import { ACTIVE_BOOKING } from '../../_schedule.enum.js';
import { BookingModel } from '../../booking.model.js';

/**
 * A booking overlapping [start, end) for the given therapist and/or room, or null.
 * Back-to-back bookings (one ends exactly when the next starts) don't overlap.
 */
export const findOverlappingBooking = async ({
    start,
    end,
    therapistId,
    roomId,
    excludeId,
}: OverlapQuery): Promise<Booking | null> =>
    BookingModel.findOne({
        ...ACTIVE_BOOKING,
        ...(therapistId ? { therapistId } : {}),
        ...(roomId ? { roomId } : {}),
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        start: { $lt: end },
        end: { $gt: start },
    }).lean<Booking>();
