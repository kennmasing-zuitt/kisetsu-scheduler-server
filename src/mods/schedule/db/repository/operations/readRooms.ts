import type { Room } from '../../_schedule.types.js';
import { RoomModel } from '../../room.model.js';

/** Every room, sorted by name ("Room 2" before "Room 10"). */
export const readRooms = async (): Promise<Room[]> =>
    RoomModel.find()
        .collation({ locale: 'en', numericOrdering: true })
        .sort({ name: 1, _id: 1 })
        .lean<Room[]>();
