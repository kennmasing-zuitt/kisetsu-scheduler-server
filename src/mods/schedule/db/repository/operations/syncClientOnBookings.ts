import { BookingModel } from '../../booking.model.js';

/** Bookings keep a copy of the client's name and mobile for the calendar: refresh them. */
export const syncClientOnBookings = async (
    clientId: string,
    { name, mobile }: { name: string; mobile: string },
): Promise<void> => {
    await BookingModel.updateMany({ clientId }, { $set: { client: name, clientMobile: mobile } });
};
