import { env } from '../../../../core/config/env.js';
import { zonedParts } from '../../../../shared/time.js';

interface Availability {
    offDays: readonly number[];
    leaveDates: readonly string[];
}

/** True when the therapist doesn't work on the (business time zone) day of `when`. */
export function isTherapistOff(therapist: Availability, when: Date): boolean {
    const { weekday, dateKey } = zonedParts(when, env.SCHEDULE_TIMEZONE);
    return therapist.offDays.includes(weekday) || therapist.leaveDates.includes(dateKey);
}
