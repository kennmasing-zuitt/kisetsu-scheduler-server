import { BookingStatus, type CancelReason } from '../../_schedule.enum.js';
import type { Booking } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

/**
 * Marks a booking cancelled (kept, but frees its slot). Only an active booking changes, so two
 * cancels racing can't both "win". Returns the cancelled booking, or null.
 */
export const cancelBooking = async (
    _id: string,
    reason: CancelReason,
    cancelledBy: string | null,
): Promise<Booking | null> =>
    BookingModel.findOneAndUpdate(
        { _id, status: { $ne: BookingStatus.cancelled } },
        {
            $set: {
                status: BookingStatus.cancelled,
                cancelledAt: new Date(),
                cancelReason: reason,
                cancelledBy,
            },
        },
        { returnDocument: 'after' },
    ).lean<Booking>();
