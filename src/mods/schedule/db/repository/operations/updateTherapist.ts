import type { Therapist, UpdateTherapistData } from '../../_schedule.types.js';
import { TherapistModel } from '../../therapist.model.js';

export const updateTherapist = async ({
    _id,
    ...fields
}: UpdateTherapistData): Promise<Therapist | null> => {
    // Only $set the fields that were actually provided
    const $set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    return TherapistModel.findByIdAndUpdate(
        _id,
        { $set },
        { returnDocument: 'after', runValidators: true },
    ).lean<Therapist>();
};
