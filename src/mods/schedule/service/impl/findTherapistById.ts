import type { Therapist } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const findTherapistById = async (_id: string): Promise<Therapist | null> =>
    ScheduleOperations.findTherapistById(_id);
