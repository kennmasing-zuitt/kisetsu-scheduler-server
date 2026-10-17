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
