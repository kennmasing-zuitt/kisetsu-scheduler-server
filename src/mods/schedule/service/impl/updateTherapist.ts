import { NotFoundError } from '../../../../shared/errors/AppError.js';
import type { Therapist, UpdateTherapistData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const updateTherapist = async (data: UpdateTherapistData): Promise<Therapist> => {
    const updatedTherapist = await ScheduleOperations.updateTherapist({
        _id: data._id,
        name: data.name,
        offDays: data.offDays,
        leaveDates: data.leaveDates,
    });

    if (!updatedTherapist) throw new NotFoundError('Therapist not found');

    return updatedTherapist;
};
