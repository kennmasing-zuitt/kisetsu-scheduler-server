import type { PromoWithUsage } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/** Promos with how many bookings used each (used ones have locked terms). */
export async function readPromos(
    options: { includeArchived?: boolean } = {},
): Promise<PromoWithUsage[]> {
    const promos = await ScheduleOperations.readPromos(options);
    const used = await ScheduleOperations.countBookingsByPromo(promos.map((p) => String(p._id)));
    return promos.map((p) => ({ ...p, timesUsed: used.get(String(p._id)) ?? 0 }));
}
