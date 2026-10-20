import type { Service } from '../../_schedule.types.js';
import { ServiceModel } from '../../service.model.js';

export const findServiceById = async (_id: string): Promise<Service | null> =>
    ServiceModel.findById(_id).lean<Service>();
