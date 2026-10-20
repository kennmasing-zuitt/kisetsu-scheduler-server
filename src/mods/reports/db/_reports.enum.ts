/** Report windows. Weeks run Monday to Sunday; all dates are in SCHEDULE_TIMEZONE. */
export enum ReportPeriod {
    weekly = 'weekly',
    monthly = 'monthly',
    annual = 'annual',
}

/** Why a booking contributed no revenue */
export enum UnpricedReason {
    /** Made before services existed (or its service was removed) */
    noService = 'noService',
    /** The service has no price rule for that date, weekday and length */
    noPrice = 'noPrice',
}

/** Currency of every amount (service prices are stored in PHP) */
export const REPORT_CURRENCY = 'PHP';
