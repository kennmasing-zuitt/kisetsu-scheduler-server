import type { BookingDocument, NewBookingRecord } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

export const createBooking = async (data: NewBookingRecord): Promise<BookingDocument> =>
    BookingModel.create(data);
