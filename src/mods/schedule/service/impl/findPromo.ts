import type { PromoWithUsage } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/** One promo (by id or code) with its usage count; null when not found. */
export async function findPromo(
    by: { id: string } | { code: string },
): Promise<PromoWithUsage | null> {
    const promo =
        'id' in by
            ? await ScheduleOperations.findPromoById(by.id)
            : await ScheduleOperations.findPromoByCode(by.code);
    if (!promo) return null;
    const used = await ScheduleOperations.countBookingsByPromo([String(promo._id)]);
    return { ...promo, timesUsed: used.get(String(promo._id)) ?? 0 };
}
