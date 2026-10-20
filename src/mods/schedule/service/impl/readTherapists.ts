import type { Therapist } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const readTherapists = async (): Promise<Therapist[]> => ScheduleOperations.readTherapists();
