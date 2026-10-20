import type { Room, UpdateRoomData } from '../../_schedule.types.js';
import { RoomModel } from '../../room.model.js';

export const updateRoom = async ({ _id, ...fields }: UpdateRoomData): Promise<Room | null> => {
    // Only $set the fields that were actually provided
    const $set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    return RoomModel.findByIdAndUpdate(
        _id,
        { $set },
        { returnDocument: 'after', runValidators: true },
    ).lean<Room>();
};
