import { addDays, weekdayOf } from '../../../../shared/time.js';
import { ReportPeriod } from '../../db/_reports.enum.js';

export interface ReportRange {
    /** First day (inclusive), "YYYY-MM-DD" */
    from: string;
    /** Last day (inclusive) */
    to: string;
    /** The day after the last one */
    toExclusive: string;
    /** Chart buckets in order: days for weekly/monthly, months ("YYYY-MM") for annual */
    bucketKeys: string[];
    /** The bucket a local date falls in */
    bucketOf: (dateKey: string) => string;
}

const daysBetween = (from: string, toExclusive: string): string[] => {
    const days: string[] = [];
    for (let d = from; d < toExclusive; d = addDays(d, 1)) days.push(d);
    return days;
};

/**
 * The calendar window of a report containing `date`:
 *   weekly  -> Monday to Sunday
 *   monthly -> the 1st to the last day of the month
 *   annual  -> January 1st to December 31st
 */
export function reportRange(period: ReportPeriod, date: string): ReportRange {
    const [y, m] = date.split('-').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');

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
