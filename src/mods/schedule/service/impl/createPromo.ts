import { mongo } from 'mongoose';
import { ConflictError } from '../../../../shared/errors/AppError.js';
import type { PromoData, PromoWithUsage } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

export const promoCodeTaken = (code: string) =>
    new ConflictError(`The promo code ${code} already exists`, 'PROMO_CODE_TAKEN');

export async function createPromo(data: PromoData): Promise<PromoWithUsage> {
    try {
        const doc = await ScheduleOperations.createPromo(data);
        return { ...doc.toObject(), timesUsed: 0 };
    } catch (err) {
        if (err instanceof mongo.MongoServerError && err.code === 11000) {
            throw promoCodeTaken(data.code);
        }
        throw err;
    }
}
