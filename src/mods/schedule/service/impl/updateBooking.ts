import { NotFoundError } from '../../../../shared/errors/AppError.js';
import type { Booking, UpdateBookingData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { assertBookingAllowed } from './assertBookingAllowed.js';

/** Edit, move (time / therapist) or change the room of a booking. Only sent fields change. */
export const updateBooking = async (data: UpdateBookingData): Promise<Booking> => {
    const current = await ScheduleOperations.findBookingById(data._id);
    if (!current) throw new NotFoundError('Booking not found');

    // The rules apply to the booking as it will be after the update
    await assertBookingAllowed(
        {
            therapistId: data.therapistId ?? String(current.therapistId),
            roomId: data.roomId ?? String(current.roomId),
            start: data.start ?? current.start,
            end: data.end ?? current.end,
            serviceId:
                data.serviceId ?? (current.serviceId ? String(current.serviceId) : undefined),
        },
        data._id,
        // Moving a booking whose service was archived since is fine; picking it anew is not
        { allowArchivedService: !data.serviceId || data.serviceId === String(current.serviceId) },
    );

    const updatedBooking = await ScheduleOperations.updateBooking({
        _id: data._id,
        client: data.client,
        therapistId: data.therapistId,
        roomId: data.roomId,
        serviceId: data.serviceId,
        start: data.start,
        end: data.end,
    });

    if (!updatedBooking) throw new NotFoundError('Booking not found');

    return updatedBooking;
};
