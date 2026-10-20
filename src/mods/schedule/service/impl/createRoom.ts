import type { CreateRoomData, RoomDocument } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const createRoom = async (data: CreateRoomData): Promise<RoomDocument> =>
    ScheduleOperations.createRoom({ name: data.name, color: data.color });
