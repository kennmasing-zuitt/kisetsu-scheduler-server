import type { Therapist } from '../../_schedule.types.js';
import { TherapistModel } from '../../therapist.model.js';

export const findTherapistById = async (_id: string): Promise<Therapist | null> =>
    TherapistModel.findById(_id).lean<Therapist>();
