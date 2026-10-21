import type { Booking } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

/** A client's bookings, newest first */
export const findBookingsByClient = async (clientId: string, limit: number): Promise<Booking[]> =>
    BookingModel.find({ clientId }).sort({ start: -1, _id: -1 }).limit(limit).lean<Booking[]>();
