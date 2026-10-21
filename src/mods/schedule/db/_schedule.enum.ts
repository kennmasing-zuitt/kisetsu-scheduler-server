/** How a promo discounts a booking's price */
export enum DiscountType {
    /** `value` percent off the price */
    percent = 'percent',
    /** `value` pesos off the price (never below zero) */
    amount = 'amount',
}
export const DISCOUNT_TYPE_VALUES = Object.values(DiscountType) as DiscountType[];
