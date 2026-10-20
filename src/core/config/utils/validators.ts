import { EnvError, makeValidator } from 'envalid';

export const mongoUri = makeValidator<string>((input) => {
    if (!/^mongodb(\+srv)?:\/\//.test(input)) {
        throw new EnvError('must start with mongodb:// or mongodb+srv://');
    }
    return input;
});

export const commaList = makeValidator<string[]>((input) =>
    input
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
);

export const secret = makeValidator<string>((input) => {
    if (input.length < 32) throw new EnvError('must be at least 32 characters');
    return input;
});

/** "HH:MM", 24-hour clock */
export const hhmm = makeValidator<string>((input) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input)) throw new EnvError('must be HH:MM (24-hour)');
    return input;
});

/** An IANA time zone such as "Asia/Manila" */
export const timeZone = makeValidator<string>((input) => {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: input });
    } catch {
        throw new EnvError('must be an IANA time zone, e.g. Asia/Manila');
    }
    return input;
});
