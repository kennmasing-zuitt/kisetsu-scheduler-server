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
