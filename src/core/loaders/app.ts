import type { Server } from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { expressMiddleware } from '@as-integrations/express5';
import { bookingCorsOptions, corsOptions } from '../config/cors.js';
import { env } from '../config/env.js';
import { BOOKING_GRAPHQL_PATH, GRAPHQL_PATH } from '../config/graphql.js';
import { createApolloServer } from '../graphql/apollo.js';
import { buildBookingSchema } from '../graphql/schema.js';
import { buildContext } from '../graphql/context.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { notFound } from '../middleware/notFound.js';
import { apiLimiter, bookingApiLimiter } from '../middleware/rateLimit.js';
import { requestId } from '../middleware/requestId.js';
import { requestLogger } from '../middleware/requestLogger.js';
import { verifyClientToken } from '../middleware/verifyClientToken.js';
import { verifyToken } from '../middleware/verifyToken.js';

interface CreateAppOptions {
    /** Pass the HTTP server so Apollo can drain it on shutdown (omit in tests). */
    httpServer?: Server;
}

export async function createApp({ httpServer }: CreateAppOptions = {}) {
    const app = express();
    app.disable('x-powered-by');
    if (env.TRUST_PROXY > 0) {
        app.set('trust proxy', env.TRUST_PROXY);
    }
    app.use(requestId);
    app.use(requestLogger);
    // The Apollo Sandbox page (dev only) loads scripts from Apollo's CDN, so CSP is
    // relaxed outside production. Production serves JSON only and keeps the strict default.
    app.use(helmet({ contentSecurityPolicy: env.isProduction }));
    // Infrastructure liveness probe (Docker / load balancer); not part of the API
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    const apollo = createApolloServer(httpServer);
    // The public booking API has its own schema; only the staff server drains the HTTP server
    const bookingApollo = createApolloServer(undefined, buildBookingSchema());
    await Promise.all([apollo.start(), bookingApollo.start()]);

    // Public booking site: own CORS list, rate limit and client sessions (never staff tokens).
    // Mounted before /graphql so the staff CORS list never applies to it.
    app.use(
        BOOKING_GRAPHQL_PATH,
        cors(bookingCorsOptions),
        bookingApiLimiter,
        verifyClientToken,
        express.json({ limit: '100kb' }),
        expressMiddleware(bookingApollo, { context: buildContext }),
    );

    app.use(
        GRAPHQL_PATH,
        cors(corsOptions),
        apiLimiter,
        verifyToken, // sets req.user, or 401s on a bad/expired/revoked token
        express.json({ limit: '1mb' }),
        expressMiddleware(apollo, { context: buildContext }),
    );

    app.use(notFound);
    app.use(errorHandler);
    return { app, apollo, bookingApollo };
}
