/** Wall-clock parts of an instant in a given IANA time zone. */
export interface ZonedParts {
    /** Local calendar date "YYYY-MM-DD" */
    dateKey: string;
    /** 0 = Sunday … 6 = Saturday */
    weekday: number;
    /** Minutes since local midnight */
    minutes: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
    let f = formatters.get(timeZone);
    if (!f) {
        f = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'short',
            hourCycle: 'h23',
        });
        formatters.set(timeZone, f);
    }
    return f;
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
    const parts = formatterFor(timeZone).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? '';
    return {
        dateKey: `${get('year')}-${get('month')}-${get('day')}`,
        weekday: WEEKDAYS.indexOf(get('weekday')),
        minutes: Number(get('hour')) * 60 + Number(get('minute')),
    };
}

/** "HH:MM" -> minutes since midnight */
export const minutesOf = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

/** "YYYY-MM-DD" plus `days` (negative to go back), as plain calendar arithmetic. */
export function addDays(dateKey: string, days: number): string {
    const d = new Date(`${dateKey}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a calendar date. */
export const weekdayOf = (dateKey: string): number => new Date(`${dateKey}T00:00:00Z`).getUTCDay();

/**
 * The instant when the wall clock in `timeZone` shows `dateKey` at `minutes` past midnight,
 * e.g. zonedTimeToUtc('2026-01-01', 0, 'Asia/Manila') -> 2025-12-31T16:00:00Z.
 */
export function zonedTimeToUtc(dateKey: string, minutes: number, timeZone: string): Date {
    const [y, m, d] = dateKey.split('-').map(Number);
    const wallClock = Date.UTC(y, m - 1, d, 0, minutes);
    // How far the zone is ahead of UTC at instant `t`
    const offsetAt = (t: number) => {
        const p = zonedParts(new Date(t), timeZone);
        const [py, pm, pd] = p.dateKey.split('-').map(Number);
        return Date.UTC(py, pm - 1, pd, 0, p.minutes) - t;
    };
    const first = wallClock - offsetAt(wallClock);
    // Second pass corrects the guess when a DST change falls between the two instants
    return new Date(wallClock - offsetAt(first));
}
