import type { Booking } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const findBookingById = async (_id: string): Promise<Booking | null> =>
    ScheduleOperations.findBookingById(_id);
