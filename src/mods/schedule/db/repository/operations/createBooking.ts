import type { BookingDocument, CreateBookingData } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

export const createBooking = async (data: CreateBookingData): Promise<BookingDocument> =>
    BookingModel.create(data);
