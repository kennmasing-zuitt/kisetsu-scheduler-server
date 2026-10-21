import { env } from '../../../../core/config/env.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import { addDays, zonedParts } from '../../../../shared/time.js';

/** Online slots start on this grid (minutes after opening). */
export const SLOT_STEP_MINUTES = 30;
/** Upcoming online bookings a client may hold at once (more: call the spa). */
export const MAX_UPCOMING_ONLINE_BOOKINGS = 3;

export interface BookingWindow {
    /** Today, "YYYY-MM-DD" in the business time zone */
    today: string;
    /** Last bookable day (today + BOOKING_DAYS_AHEAD) */
    lastDay: string;
    /** Earliest bookable start (now + BOOKING_MIN_LEAD_MINUTES) */
    earliestStart: Date;
}

export function bookingWindow(now = new Date()): BookingWindow {
    const today = zonedParts(now, env.SCHEDULE_TIMEZONE).dateKey;
    return {
        today,
        lastDay: addDays(today, env.BOOKING_DAYS_AHEAD),
        earliestStart: new Date(now.getTime() + env.BOOKING_MIN_LEAD_MINUTES * 60_000),
    };
}

/** OUTSIDE_BOOKING_WINDOW unless the day is between today and today + BOOKING_DAYS_AHEAD. */
export function assertDayBookable(dateKey: string, window: BookingWindow): void {
    if (dateKey < window.today || dateKey > window.lastDay) {
        throw new AppError(
            400,
            'OUTSIDE_BOOKING_WINDOW',
            `Online bookings are for the next ${env.BOOKING_DAYS_AHEAD} days. Please call us for later dates.`,
        );
    }
}

/** OUTSIDE_BOOKING_WINDOW unless `start` is far enough ahead and within the bookable days. */
export function assertStartBookable(start: Date, window: BookingWindow): void {
    if (start < window.earliestStart) {
        const hours = Math.round(env.BOOKING_MIN_LEAD_MINUTES / 60);
        throw new AppError(
            400,
            'OUTSIDE_BOOKING_WINDOW',
            `Online bookings need at least ${hours} hours' notice. Please call us for sooner times.`,
        );
    }
    assertDayBookable(zonedParts(start, env.SCHEDULE_TIMEZONE).dateKey, window);
}
