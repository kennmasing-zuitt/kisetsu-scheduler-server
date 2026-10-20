import type { Room } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const readRooms = async (): Promise<Room[]> => ScheduleOperations.readRooms();
