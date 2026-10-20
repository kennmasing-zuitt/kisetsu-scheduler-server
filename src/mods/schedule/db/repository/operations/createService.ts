import type { CreateServiceData, ServiceDocument } from '../../_schedule.types.js';
import { ServiceModel } from '../../service.model.js';

export const createService = async (data: CreateServiceData): Promise<ServiceDocument> =>
    ServiceModel.create(data);
