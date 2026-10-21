import { addDays, weekdayOf } from '../../../../shared/time.js';
import { ReportPeriod } from '../../db/_reports.enum.js';

export interface ReportRange {
    /** First day (inclusive), "YYYY-MM-DD" */
    from: string;
    /** Last day (inclusive) */
    to: string;
    /** The day after the last one */
    toExclusive: string;
    /** Chart buckets in order: hours ("YYYY-MM-DDTHH") for daily, days for weekly/monthly,
     *  months ("YYYY-MM") for annual */
    bucketKeys: string[];
    /** The bucket of a local date and time (minutes since midnight) */
    bucketOf: (dateKey: string, minutes: number) => string;
}

/** Opening hours, in minutes since midnight: the hours a daily chart shows */
export interface OpeningHours {
    opens: number;
    closes: number;
}

const daysBetween = (from: string, toExclusive: string): string[] => {
    const days: string[] = [];
    for (let d = from; d < toExclusive; d = addDays(d, 1)) days.push(d);
    return days;
};

/**
 * The calendar window of a report containing `date`:
 *   daily   -> that day, charted per hour of opening hours
 *   weekly  -> Monday to Sunday
 *   monthly -> the 1st to the last day of the month
 *   annual  -> January 1st to December 31st
 */
export function reportRange(
    period: ReportPeriod,
    date: string,
    hours: OpeningHours = { opens: 0, closes: 24 * 60 },
): ReportRange {
    const [y, m] = date.split('-').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');

    if (period === ReportPeriod.daily) {
        const first = Math.floor(hours.opens / 60);
        const last = Math.ceil(hours.closes / 60) - 1; // closing at 22:00 -> last hour 21:00
        const hourKey = (h: number) => `${date}T${pad(h)}`;
        return {
            from: date,
            to: date,
            toExclusive: addDays(date, 1),
            bucketKeys: Array.from({ length: Math.max(0, last - first + 1) }, (_, i) =>
                hourKey(first + i),
            ),
            // Bookings outside opening hours still count in the totals, just not in the chart
            bucketOf: (_d, minutes) => hourKey(Math.floor(minutes / 60)),
        };
    }

    if (period === ReportPeriod.weekly) {
        const from = addDays(date, -((weekdayOf(date) + 6) % 7)); // back to Monday
        const toExclusive = addDays(from, 7);
        return {
            from,
            to: addDays(toExclusive, -1),
            toExclusive,
            bucketKeys: daysBetween(from, toExclusive),
            bucketOf: (d) => d,
        };
    }

    if (period === ReportPeriod.monthly) {
        const from = `${y}-${pad(m)}-01`;
        const toExclusive = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
        return {
            from,
            to: addDays(toExclusive, -1),
            toExclusive,
            bucketKeys: daysBetween(from, toExclusive),
            bucketOf: (d) => d,
        };
    }

    const from = `${y}-01-01`;
    const toExclusive = `${y + 1}-01-01`;
    return {
        from,
        to: `${y}-12-31`,
        toExclusive,
        bucketKeys: Array.from({ length: 12 }, (_, i) => `${y}-${pad(i + 1)}`),
        bucketOf: (d) => d.slice(0, 7),
    };
}
