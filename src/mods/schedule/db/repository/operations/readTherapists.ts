import type { Therapist } from '../../_schedule.types.js';
import { TherapistModel } from '../../therapist.model.js';

/** The whole roster (it's small and every calendar view needs all of it), sorted by name. */
export const readTherapists = async (): Promise<Therapist[]> =>
    TherapistModel.find()
        // numericOrdering: "Room 2" before "Room 10"
        .collation({ locale: 'en', numericOrdering: true })
        .sort({ name: 1, _id: 1 })
        .lean<Therapist[]>();
