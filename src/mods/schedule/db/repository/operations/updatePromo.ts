import type { Promo, UpdatePromoData } from '../../_schedule.types.js';
import { PromoModel } from '../../promo.model.js';

export const updatePromo = async ({ _id, ...fields }: UpdatePromoData): Promise<Promo | null> => {
    // undefined = unchanged; null is a value (validTo: null removes the end date)
    const $set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    return PromoModel.findByIdAndUpdate(
        _id,
        { $set },
        { returnDocument: 'after', runValidators: true },
    ).lean<Promo>();
};
