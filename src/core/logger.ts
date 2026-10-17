import winston from 'winston';
import { env } from './config/env.js';
import { requestContext } from './requestContext.js';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Keys whose values must never reach the logs: anything ENDING in password / token / secret /
// authorization / cookie (password, newPassword, token, accessToken, ...). `tokenVersion` is kept.
const SENSITIVE_KEY = /(pass(word)?|token|secret|authorization|cookie)$/i;

/** Deep-copies a value, replacing sensitive fields with '[REDACTED]'. */
export function redact(value: unknown, depth = 0): unknown {
    if (depth > 8 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
    if (value instanceof Date) return value;
    return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [
            k,
            SENSITIVE_KEY.test(k) ? '[REDACTED]' : redact(v, depth + 1),
        ]),
    );
}

// Last line of defence: scrubs sensitive keys from every log entry's metadata
const redactSensitive = winston.format((info) => {
    for (const key of Object.keys(info)) {
        if (key === 'level' || key === 'message') continue;
        info[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(info[key]);
    }
    return info;
});

// Copies the current request's ID onto every log entry (if inside a request)
const addRequestId = winston.format((info) => {
    const store = requestContext.getStore();
    if (store) info.requestId = store.requestId;
    return info;
});

const devFormat = combine(
    redactSensitive(),
    addRequestId(),
    colorize(),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ timestamp, level, message, stack, requestId, ...meta }) => {
        const reqId = requestId ? ` [${String(requestId).slice(0, 8)}]` : '';
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}${reqId}: ${message}${extra}${stack ? `\n${stack}` : ''}`;
    }),
);

const prodFormat = combine(
    redactSensitive(),
    addRequestId(),
    timestamp(),
    errors({ stack: true }),
    json(),
);

export const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: env.isProduction ? prodFormat : devFormat,
    transports: [new winston.transports.Console()],
});
