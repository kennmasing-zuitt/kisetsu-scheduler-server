import type { Booking } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

export const findBookingById = async (_id: string): Promise<Booking | null> =>
    BookingModel.findById(_id).lean<Booking>();
