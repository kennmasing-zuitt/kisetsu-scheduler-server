import { mongo } from 'mongoose';
import { ConflictError } from '../../../../shared/errors/AppError.js';
import type { CreateServiceData, ServiceDocument } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const serviceNameTaken = (name: string) =>
    new ConflictError(`A service named "${name}" already exists`, 'SERVICE_NAME_TAKEN');

/** Adds a service with its price list (already validated: no overlapping rules). */
export const createService = async (data: CreateServiceData): Promise<ServiceDocument> => {
    try {
        return await ScheduleOperations.createService({
            name: data.name,
            description: data.description,
            isActive: data.isActive,
            prices: data.prices,
        });
    } catch (err) {
        // The unique (case-insensitive) name index
        if (err instanceof mongo.MongoServerError && err.code === 11000) {
            throw serviceNameTaken(data.name);
        }
        throw err;
    }
};
