import type { Service, UpdateServiceData } from '../../_schedule.types.js';
import { ServiceModel } from '../../service.model.js';

export const updateService = async ({
    _id,
    ...fields
}: UpdateServiceData): Promise<Service | null> => {
    // Only $set the fields that were actually provided (`prices` replaces the whole list)
    const $set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    return ServiceModel.findByIdAndUpdate(
        _id,
        { $set },
        { returnDocument: 'after', runValidators: true },
    ).lean<Service>();
};
