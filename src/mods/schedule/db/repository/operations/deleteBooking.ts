import { BookingModel } from '../../booking.model.js';

export const deleteBooking = async (_id: string): Promise<boolean> => {
    const result = await BookingModel.deleteOne({ _id });
    return result.deletedCount > 0;
};
