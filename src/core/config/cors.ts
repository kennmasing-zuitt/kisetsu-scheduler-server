import type { CorsOptions } from 'cors';
import { AppError } from '../../shared/errors/AppError.js';
import { env } from './env.js';

const allowOrigins =
    (allowed: () => string[]): CorsOptions['origin'] =>
    (origin, callback) => {
        // Allow tools with no Origin header (curl, Postman, server-to-server)
        if (!origin || allowed().includes(origin)) callback(null, true);
        else
            callback(new AppError(403, 'CORS_NOT_ALLOWED', `Origin ${origin} not allowed by CORS`));
    };

/** Staff API (/graphql): the scheduling app's origins (CORS_ORIGINS). */
export const corsOptions: CorsOptions = {
    origin: allowOrigins(() => env.CORS_ORIGINS),
    credentials: true,
    // GraphQL only needs GET (queries) and POST (queries + mutations)
    methods: ['GET', 'POST', 'OPTIONS'],
    // apollo-require-preflight lets browsers pass Apollo's CSRF protection on GET requests
    allowedHeaders: ['Content-Type', 'Authorization', 'apollo-require-preflight', 'x-request-id'],
    exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After', 'X-Request-Id'],
    maxAge: 600,
};

/** Public booking API (/booking/graphql): the booking site's origins (BOOKING_CORS_ORIGINS). */
export const bookingCorsOptions: CorsOptions = {
    ...corsOptions,
    origin: allowOrigins(() => env.BOOKING_CORS_ORIGINS),
    // Sessions travel in the Authorization header; no cookies
    credentials: false,
};
