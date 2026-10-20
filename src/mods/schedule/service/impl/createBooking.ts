import type { BookingDocument, CreateBookingData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { assertBookingAllowed } from './assertBookingAllowed.js';

export const createBooking = async (data: CreateBookingData): Promise<BookingDocument> => {
    await assertBookingAllowed(data);
    return ScheduleOperations.createBooking({
        client: data.client,
        therapistId: data.therapistId,
        roomId: data.roomId,
        serviceId: data.serviceId,
        start: data.start,
        end: data.end,
        createdBy: data.createdBy,
    });
};
