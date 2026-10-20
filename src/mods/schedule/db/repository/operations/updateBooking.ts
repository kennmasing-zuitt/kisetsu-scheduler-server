import type { Booking, UpdateBookingData } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

export const updateBooking = async ({
    _id,
    ...fields
}: UpdateBookingData): Promise<Booking | null> => {
    // Only $set the fields that were actually provided
    const $set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    return BookingModel.findByIdAndUpdate(
        _id,
        { $set },
        { returnDocument: 'after', runValidators: true },
    ).lean<Booking>();
};
