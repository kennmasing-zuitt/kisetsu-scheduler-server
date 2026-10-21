import { PromoModel } from '../../promo.model.js';

export const deletePromo = async (_id: string): Promise<boolean> => {
    const result = await PromoModel.deleteOne({ _id });
    return result.deletedCount > 0;
};
