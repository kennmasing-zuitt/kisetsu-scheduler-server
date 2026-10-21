import { mongo } from 'mongoose';
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from '../../../../shared/errors/AppError.js';
import { DiscountType } from '../../db/_schedule.enum.js';
import type { PromoWithUsage, UpdatePromoData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { promoCodeTaken } from './createPromo.js';
import { findPromo } from './findPromo.js';

const sameIds = (a: unknown[], b: unknown[]) =>
    a.length === b.length && a.map(String).sort().join() === b.map(String).sort().join();

/**
 * Edit a promo. Archive / activate (isActive), description and period can change any time.
 * Its terms (code, discountType, value, serviceIds) are locked once a booking uses it
 * (PROMO_LOCKED), so reports for past bookings never change: create a new code instead.
 */
export async function updatePromo(data: UpdatePromoData): Promise<PromoWithUsage> {
    const current = await findPromo({ id: data._id });
    if (!current) throw new NotFoundError('Promo not found');

    const changedTerms = [
        data.code !== undefined && data.code !== current.code && 'code',
        data.discountType !== undefined &&
            data.discountType !== current.discountType &&
            'discount type',
        data.value !== undefined && data.value !== current.value && 'value',
        data.serviceIds !== undefined &&
            !sameIds(data.serviceIds, current.serviceIds) &&
            'services',
    ].filter(Boolean);
    if (changedTerms.length && current.timesUsed > 0) {
        throw new ConflictError(
            `${current.code} has been used by ${current.timesUsed} booking` +
                `${current.timesUsed === 1 ? '' : 's'}, so its ${changedTerms.join(', ')} can't ` +
                'change. Create a new code instead.',
            'PROMO_LOCKED',
            { timesUsed: current.timesUsed },
        );
    }

    // Rules that depend on the merged result
    const discountType = data.discountType ?? current.discountType;
    const value = data.value ?? current.value;
    if (discountType === DiscountType.percent && value > 100) {
        throw new ValidationError('A percent discount is at most 100');
    }
    const validFrom = data.validFrom ?? current.validFrom;
    const validTo = data.validTo === undefined ? current.validTo : data.validTo;
    if (validTo && validTo < validFrom) {
        throw new ValidationError('validTo must be on or after validFrom');
    }

    try {
        await ScheduleOperations.updatePromo({
            _id: data._id,
            code: data.code,
            description: data.description,
            discountType: data.discountType,
            value: data.value,
            validFrom: data.validFrom,
            validTo: data.validTo,
            serviceIds: data.serviceIds,
            isActive: data.isActive,
        });
    } catch (err) {
        if (err instanceof mongo.MongoServerError && err.code === 11000) {
            throw promoCodeTaken(data.code ?? current.code);
        }
        throw err;
    }
    return (await findPromo({ id: data._id }))!;
}
