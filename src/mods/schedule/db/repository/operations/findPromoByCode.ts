import type { Promo } from '../../_schedule.types.js';
import { PromoModel } from '../../promo.model.js';

/** Codes are stored upper-case; the lookup ignores case */
export const findPromoByCode = async (code: string): Promise<Promo | null> =>
    PromoModel.findOne({ code: code.trim().toUpperCase() }).lean<Promo>();
