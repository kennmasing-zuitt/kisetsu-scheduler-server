import { BookingModel } from '../../booking.model.js';

/** How many bookings (past or upcoming) use a service. */
export const countBookingsForService = async (serviceId: string): Promise<number> =>
    BookingModel.countDocuments({ serviceId });
