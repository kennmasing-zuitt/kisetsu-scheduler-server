import { ServiceModel } from '../../service.model.js';

export const deleteService = async (_id: string): Promise<boolean> => {
    const result = await ServiceModel.deleteOne({ _id });
    return result.deletedCount > 0;
};
