import winston from 'winston';
import { env } from './config/env.js';
import { requestContext } from './requestContext.js';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Copies the current request's ID onto every log entry (if inside a request)
const addRequestId = winston.format((info) => {
    const store = requestContext.getStore();
    if (store) info.requestId = store.requestId;
    return info;
});

const devFormat = combine(
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

const prodFormat = combine(addRequestId(), timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: env.isProduction ? prodFormat : devFormat,
    transports: [new winston.transports.Console()],
});
