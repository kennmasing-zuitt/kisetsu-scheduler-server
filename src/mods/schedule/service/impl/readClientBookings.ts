import type { Booking } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/** A client's bookings, newest first */
export const readClientBookings = async (clientId: string, limit: number): Promise<Booking[]> =>
    ScheduleOperations.findBookingsByClient(clientId, limit);
