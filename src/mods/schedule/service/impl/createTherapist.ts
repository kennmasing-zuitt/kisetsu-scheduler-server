import type { CreateTherapistData, TherapistDocument } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const createTherapist = async (data: CreateTherapistData): Promise<TherapistDocument> =>
    ScheduleOperations.createTherapist({
        name: data.name,
        offDays: data.offDays,
        leaveDates: data.leaveDates,
    });
