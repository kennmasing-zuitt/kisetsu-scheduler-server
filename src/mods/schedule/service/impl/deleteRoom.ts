import { ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/**
 * Removes a room. Refused while it still has bookings that haven't ended
 * (ROOM_HAS_BOOKINGS): move or cancel those first. Past bookings are kept.
 */
export const deleteRoom = async (_id: string): Promise<boolean> => {
    const room = await ScheduleOperations.findRoomById(_id);
    if (!room) throw new NotFoundError('Room not found');

    const upcoming = await ScheduleOperations.countUpcomingBookings({
        roomId: _id,
        after: new Date(),
    });
    if (upcoming > 0) {
        throw new ConflictError(
            `${room.name} still has ${upcoming} upcoming booking${upcoming === 1 ? '' : 's'}. ` +
                'Move or cancel them first.',
            'ROOM_HAS_BOOKINGS',
            { upcoming },
        );
    }

    const deleted = await ScheduleOperations.deleteRoom(_id);
    if (!deleted) throw new NotFoundError('Room not found');
    return true;
};
