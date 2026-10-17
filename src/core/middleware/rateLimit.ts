import type { Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { TooManyRequestsError } from '../../shared/errors/AppError.js';

const TOO_MANY_MESSAGE = 'Too many requests. Try again later.';

/**
 * Express-level limiter for the whole /graphql endpoint.
 * Replies with a GraphQL-shaped error body so clients can handle it like any other error.
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: env.API_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
        res.status(429).json({
            errors: [{ message: TOO_MANY_MESSAGE, extensions: { code: 'TOO_MANY_REQUESTS' } }],
        });
    },
});

/**
 * Per-operation limiter for sensitive mutations (register, and later login).
 * Attach it to a resolver with `@UseMiddleware(RateLimit(authLimiter))`
 * (see core/graphql/middleware/rateLimit.ts).
 *
 * GraphQL answers 200 even when a resolver fails, so instead of the HTTP status we use a
 * `res.locals.rateLimitFailed` flag (set by `markRateLimitFailure`) to decide which attempts count.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only failed attempts count
    requestWasSuccessful: (_req, res) => !res.locals.rateLimitFailed,
    handler: (_req, _res, next) => next(new TooManyRequestsError(TOO_MANY_MESSAGE)),
    // One HTTP request may run several mutations (aliases), each calling the limiter
    validate: { singleCount: false },
});

export const markRateLimitFailure = (res: Response) => {
    res.locals.rateLimitFailed = true;
};
