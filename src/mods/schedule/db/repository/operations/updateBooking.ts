import type { Booking, BookingRecordPatch } from '../../_schedule.types.js';
import { BookingModel } from '../../booking.model.js';

export const updateBooking = async ({
    _id,
    ...fields
}: BookingRecordPatch): Promise<Booking | null> => {
    // Only $set the fields that were actually provided (null is a value: it removes a promo)
    const $set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    return BookingModel.findByIdAndUpdate(
        _id,
        { $set },
        { returnDocument: 'after', runValidators: true },
    ).lean<Booking>();
};
