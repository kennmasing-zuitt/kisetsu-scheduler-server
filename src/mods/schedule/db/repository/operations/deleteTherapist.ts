import { TherapistModel } from '../../therapist.model.js';

export const deleteTherapist = async (_id: string): Promise<boolean> => {
    const result = await TherapistModel.deleteOne({ _id });
    return result.deletedCount > 0;
};
