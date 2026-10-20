import type { Service } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const readServices = async (
    options: { includeArchived?: boolean } = {},
): Promise<Service[]> => ScheduleOperations.readServices(options);
