import { NotFoundError } from '../../../../shared/errors/AppError.js';
import type { Room, UpdateRoomData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const updateRoom = async (data: UpdateRoomData): Promise<Room> => {
    const updatedRoom = await ScheduleOperations.updateRoom({
        _id: data._id,
        name: data.name,
        color: data.color,
    });

    if (!updatedRoom) throw new NotFoundError('Room not found');

    return updatedRoom;
};
