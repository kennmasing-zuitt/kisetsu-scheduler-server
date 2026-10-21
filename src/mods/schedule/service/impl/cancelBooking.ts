import { ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import { BookingStatus, CancelReason } from '../../db/_schedule.enum.js';
import type { Booking } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { notifyCancelledBooking } from './notifyCancelledBooking.js';

export interface CancelOptions {
    reason: CancelReason;
    /** The staff member cancelling (null when the system does it) */
    cancelledBy: string | null;
    /** Text the client that the booking was cancelled */
    notifyClient: boolean;
}

/**
 * Cancels a booking: it stays stored (history, texts, reports) but frees the therapist and room.
 * NOT_FOUND if it doesn't exist, BOOKING_CANCELLED if it already was.
 */
export const cancelBooking = async (_id: string, opts: CancelOptions): Promise<Booking> => {
    const cancelled = await ScheduleOperations.cancelBooking(_id, opts.reason, opts.cancelledBy);
    if (!cancelled) {
        const existing = await ScheduleOperations.findBookingById(_id);
        if (!existing) throw new NotFoundError('Booking not found');
        throw new ConflictError('This booking is already cancelled', 'BOOKING_CANCELLED');
    }
    if (opts.notifyClient) await notifyCancelledBooking(cancelled, opts.reason);
    return cancelled;
};

/** Staff "Cancel booking". */
export const cancelBookingByStaff = (_id: string, userId: string, notifyClient: boolean) =>
    cancelBooking(_id, { reason: CancelReason.staff, cancelledBy: userId, notifyClient });

export const isCancelled = (b: Pick<Booking, 'status'>) => b.status === BookingStatus.cancelled;
