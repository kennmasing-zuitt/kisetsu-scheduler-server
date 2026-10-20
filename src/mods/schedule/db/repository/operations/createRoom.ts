import type { CreateRoomData, RoomDocument } from '../../_schedule.types.js';
import { RoomModel } from '../../room.model.js';

export const createRoom = async (data: CreateRoomData): Promise<RoomDocument> =>
    RoomModel.create(data);
