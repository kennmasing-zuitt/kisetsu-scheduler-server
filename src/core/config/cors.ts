import type { CorsOptions } from 'cors';
import { AppError } from '../../shared/errors/AppError.js';
import { env } from './env.js';

export const corsOptions: CorsOptions = {
    origin(origin, callback) {
        // Allow tools with no Origin header (curl, Postman, server-to-server)
        if (!origin || env.CORS_ORIGINS.includes(origin)) callback(null, true);
        else
            callback(new AppError(403, 'CORS_NOT_ALLOWED', `Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    // GraphQL only needs GET (queries) and POST (queries + mutations)
    methods: ['GET', 'POST', 'OPTIONS'],
    // apollo-require-preflight lets browsers pass Apollo's CSRF protection on GET requests
    allowedHeaders: ['Content-Type', 'Authorization', 'apollo-require-preflight', 'x-request-id'],
    exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After', 'X-Request-Id'],
    maxAge: 600,
};
