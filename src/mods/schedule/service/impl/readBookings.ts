import type { Booking, BookingRange } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const readBookings = async (range: BookingRange): Promise<Booking[]> =>
    ScheduleOperations.readBookings(range);
