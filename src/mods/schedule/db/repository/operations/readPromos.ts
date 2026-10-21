import type { Promo } from '../../_schedule.types.js';
import { PromoModel } from '../../promo.model.js';

/** Promos by code; archived ones only when asked for */
export const readPromos = async ({
    includeArchived = false,
}: { includeArchived?: boolean } = {}): Promise<Promo[]> =>
    PromoModel.find(includeArchived ? {} : { isActive: true })
        .sort({ code: 1 })
        .lean<Promo[]>();
