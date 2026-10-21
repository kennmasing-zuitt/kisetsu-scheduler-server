import { env } from '../../../../core/config/env.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import { zonedParts } from '../../../../shared/time.js';
import type { Promo } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

const notApplicable = (message: string) => new AppError(400, 'PROMO_NOT_APPLICABLE', message);

/**
 * A promo can be applied to a booking when it's active (unless `allowInactive`: a booking that
 * already had it keeps it), the booking's local date is inside its period, and it covers the
 * booking's service.
 */
export async function assertPromoApplies(
    promo: Promo,
    booking: { start: Date; serviceId?: string },
    { allowInactive = false }: { allowInactive?: boolean } = {},
): Promise<void> {
    if (!promo.isActive && !allowInactive) {
        throw notApplicable(`${promo.code} is not active`);
    }
    const { dateKey } = zonedParts(booking.start, env.SCHEDULE_TIMEZONE);
    if (dateKey < promo.validFrom) {
        throw notApplicable(`${promo.code} can be used from ${promo.validFrom}`);
    }
    if (promo.validTo && dateKey > promo.validTo) {
        throw notApplicable(`${promo.code} ended on ${promo.validTo}`);
    }
    const services = promo.serviceIds.map(String);
    if (services.length && (!booking.serviceId || !services.includes(booking.serviceId))) {
        const service = booking.serviceId
            ? await ScheduleOperations.findServiceById(booking.serviceId)
            : null;
        throw notApplicable(`${promo.code} doesn't apply to ${service?.name ?? 'this service'}`);
    }
}

/** The promo for a code typed on a booking, checked against it. */
export async function resolvePromo(
    code: string,
    booking: { start: Date; serviceId?: string },
    options: { allowInactive?: boolean } = {},
): Promise<Promo> {
    const promo = await ScheduleOperations.findPromoByCode(code);
    if (!promo) throw notApplicable(`Promo code "${code.trim().toUpperCase()}" doesn't exist`);
    await assertPromoApplies(promo, booking, options);
    return promo;
}
