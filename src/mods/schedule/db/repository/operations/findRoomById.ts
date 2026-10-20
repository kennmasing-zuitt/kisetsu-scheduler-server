import type { Room } from '../../_schedule.types.js';
import { RoomModel } from '../../room.model.js';

export const findRoomById = async (_id: string): Promise<Room | null> =>
    RoomModel.findById(_id).lean<Room>();
