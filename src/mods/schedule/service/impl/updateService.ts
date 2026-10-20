import { mongo } from 'mongoose';
import { NotFoundError } from '../../../../shared/errors/AppError.js';
import type { Service, UpdateServiceData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { serviceNameTaken } from './createService.js';

/**
 * Rename, describe, archive (isActive: false) or replace the price list of a service.
 * Bookings aren't touched: reports price them from the list as it is when they run, so editing
 * an old period corrects past reports too.
 */
export const updateService = async (data: UpdateServiceData): Promise<Service> => {
    let updatedService: Service | null;
    try {
        updatedService = await ScheduleOperations.updateService({
            _id: data._id,
            name: data.name,
            description: data.description,
            isActive: data.isActive,
            prices: data.prices,
        });
    } catch (err) {
        if (err instanceof mongo.MongoServerError && err.code === 11000) {
            throw serviceNameTaken(data.name ?? '');
        }
        throw err;
    }

    if (!updatedService) throw new NotFoundError('Service not found');

    return updatedService;
};
