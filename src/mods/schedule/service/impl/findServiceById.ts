import type { Service } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const findServiceById = async (_id: string): Promise<Service | null> =>
    ScheduleOperations.findServiceById(_id);
