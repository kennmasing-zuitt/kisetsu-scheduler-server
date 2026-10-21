import type { PromoData, PromoDocument } from '../../_schedule.types.js';
import { PromoModel } from '../../promo.model.js';

export const createPromo = async (data: PromoData): Promise<PromoDocument> =>
    PromoModel.create(data);
