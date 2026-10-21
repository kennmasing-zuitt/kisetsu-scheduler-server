import type { Promo } from '../../_schedule.types.js';
import { PromoModel } from '../../promo.model.js';

export const findPromoById = async (_id: string): Promise<Promo | null> =>
    PromoModel.findById(_id).lean<Promo>();
