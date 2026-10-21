import { DiscountType } from '../../db/_schedule.enum.js';
import type { PromoTerms } from '../../db/_schedule.types.js';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The discount a promo gives on a price: `value`% of it, or `value` pesos (never more than the
 * price), rounded to centavos. Used by reports and by the booking dialog's preview.
 */
export const promoDiscount = (promo: PromoTerms, price: number): number =>
    promo.discountType === DiscountType.percent
        ? round2((price * promo.value) / 100)
        : round2(Math.min(promo.value, price));
