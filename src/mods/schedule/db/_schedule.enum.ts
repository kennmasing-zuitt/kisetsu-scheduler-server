/** How a promo discounts a booking's price */
export enum DiscountType {
    /** `value` percent off the price */
    percent = 'percent',
    /** `value` pesos off the price (never below zero) */
    amount = 'amount',
}
export const DISCOUNT_TYPE_VALUES = Object.values(DiscountType) as DiscountType[];

/** Cancelled bookings are kept (for texts, history and reports) but free their slot. */
export enum BookingStatus {
    booked = 'booked',
    cancelled = 'cancelled',
}
export const BOOKING_STATUS_VALUES = Object.values(BookingStatus) as BookingStatus[];

/** Where a booking came from */
export enum BookingSource {
    /** Staff, in the scheduling app */
    staff = 'staff',
    /** The client, on the public booking site */
    client = 'client',
}
export const BOOKING_SOURCE_VALUES = Object.values(BookingSource) as BookingSource[];

export enum CancelReason {
    /** Staff cancelled it (e.g. the client called) */
    staff = 'staff',
    /** The therapist was given a day off or leave on that day */
    therapistUnavailable = 'therapistUnavailable',
}
export const CANCEL_REASON_VALUES = Object.values(CancelReason) as CancelReason[];

/**
 * Matches bookings that hold their slot. Written as "not cancelled" so bookings stored before
 * `status` existed still count.
 */
export const ACTIVE_BOOKING = { status: { $ne: BookingStatus.cancelled } } as const;
