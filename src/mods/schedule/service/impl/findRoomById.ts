import type { Room } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const findRoomById = async (_id: string): Promise<Room | null> =>
    ScheduleOperations.findRoomById(_id);
