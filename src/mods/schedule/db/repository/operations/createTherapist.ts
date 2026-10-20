import type { CreateTherapistData, TherapistDocument } from '../../_schedule.types.js';
import { TherapistModel } from '../../therapist.model.js';

export const createTherapist = async (data: CreateTherapistData): Promise<TherapistDocument> =>
    TherapistModel.create(data);
